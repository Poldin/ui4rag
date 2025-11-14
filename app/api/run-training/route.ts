import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase-server';
import { RAGStorage, type RAGStorageConfig } from '../../../lib/ai-sdk/rag-storage';
import { createEmbeddingConfig } from '../../../lib/ai-sdk/embeddings';
import { extractTextFromPendingItem } from '../../../lib/chunking';

interface TrainingStats {
  totalItems: number;
  processedItems: number;
  totalChunks: number;
  tokensUsed: number;
  errors: string[];
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendMessage = (type: string, data: any) => {
        const message = JSON.stringify({ type, data }) + '\n';
        controller.enqueue(encoder.encode(message));
      };

      try {
        const body = await request.json();
        const { ragId } = body;

        if (!ragId) {
          sendMessage('error', { message: 'RAG ID is required' });
          controller.close();
          return;
        }

        // Verifica autenticazione
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          sendMessage('error', { message: 'Unauthorized' });
          controller.close();
          return;
        }

        // Carica RAG con config e pending_changes
        const { data: ragData, error: ragError } = await supabase
          .from('rags')
          .select('config, pending_changes')
          .eq('id', ragId)
          .eq('user_id', user.id)
          .single();

        if (ragError || !ragData) {
          sendMessage('error', { message: 'RAG not found' });
          controller.close();
          return;
        }

        const config = ragData.config as any;
        const pendingItems = (ragData.pending_changes as any[]) || [];

        // Verifica configurazione
        if (!config?.apiKey || !config?.connectionString || !config?.sourcesTableName || !config?.chunksTableName) {
          console.error('❌ Config incomplete:', {
            hasApiKey: !!config?.apiKey,
            hasConnectionString: !!config?.connectionString,
            hasSourcesTableName: !!config?.sourcesTableName,
            hasChunksTableName: !!config?.chunksTableName,
          });
          sendMessage('error', { message: 'RAG configuration incomplete. Please configure OpenAI API key and database connection.' });
          controller.close();
          return;
        }
        
        console.log('✅ Config complete:', {
          hasApiKey: !!config?.apiKey,
          sourcesTableName: config?.sourcesTableName,
          chunksTableName: config?.chunksTableName,
          embeddingModel: config?.embeddingModel,
          embeddingDimensions: config?.embeddingDimensions,
        });

        if (pendingItems.length === 0) {
          sendMessage('error', { message: 'No pending items to process' });
          controller.close();
          return;
        }

        // Inizializza statistiche
        const stats: TrainingStats = {
          totalItems: pendingItems.length,
          processedItems: 0,
          totalChunks: 0,
          tokensUsed: 0,
          errors: [],
        };

        sendMessage('start', {
          totalItems: stats.totalItems,
          ragId,
        });

        // Ottieni nomi delle tabelle dalla config
        const sourcesTableName = config.sourcesTableName || 'gimme_rag_sources';
        const chunksTableName = config.chunksTableName || 'gimme_rag_chunks';
        
        sendMessage('info', { 
          message: `Using AI SDK with 2 tables: ${sourcesTableName} and ${chunksTableName}` 
        });

        // Configura RAGStorage con AI SDK
        const embeddingConfig = createEmbeddingConfig(
          config.apiKey,
          config.embeddingModel || 'text-embedding-3-small',
          config.embeddingDimensions || 1536
        );

        const storageConfig: RAGStorageConfig = {
          connectionString: config.connectionString,
          sourcesTableName,
          chunksTableName,
          embeddingConfig,
          ssl: true,
        };

        const ragStorage = new RAGStorage(storageConfig);

        try {
          // Processa ogni pending item
          for (let i = 0; i < pendingItems.length; i++) {
            const item = pendingItems[i];
            
            sendMessage('progress', {
              currentItem: i + 1,
              totalItems: stats.totalItems,
              itemTitle: item.title,
              itemType: item.type,
            });

            try {
              // Estrai il contenuto testuale dall'item
              const content = extractTextFromPendingItem(item);

              // Prepara metadata
              const metadata = {
                source_id: item.id,
                added_at: item.addedAt,
                ...item.metadata,
              };

              // Usa RAGStorage per salvare source + chunks + embeddings
              const result = await ragStorage.saveSource(
                item.title || `Untitled (${item.type})`,
                content,
                item.type,
                metadata,
                {
                  maxChunkSize: 1000,
                  chunkOverlap: 200,
                  preserveParagraphs: true,
                }
              );

              stats.processedItems++;
              stats.totalChunks += result.chunksCreated;
              stats.tokensUsed += result.tokensUsed;

              sendMessage('item_processed', {
                item: item.title,
                sourceId: result.sourceId,
                chunksCreated: result.chunksCreated,
                tokensUsed: result.tokensUsed,
              });

            } catch (itemError: any) {
              const errorMsg = `Error processing item "${item.title}": ${itemError.message}`;
              stats.errors.push(errorMsg);
              sendMessage('warning', { message: errorMsg });
              console.error('Item processing error:', itemError);
            }
          }

          // Chiudi connessione
          await ragStorage.close();

          // Ottieni statistiche finali dal database
          const finalStorage = new RAGStorage(storageConfig);
          const dbStats = await finalStorage.getStats();
          await finalStorage.close();

          sendMessage('info', {
            message: `Database stats: ${dbStats.totalSources} sources, ${dbStats.totalChunks} chunks`,
          });

          // Salva record del training nella tabella trainings
          try {
            await supabase.from('trainings').insert({
              rag_id: ragId,
              model: config.embeddingModel || 'text-embedding-3-small',
              embedding_dimensions: config.embeddingDimensions || 1536,
              status: stats.errors.length === 0 ? 'completed' : 'completed_with_errors',
              started_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
              items_processed: stats.processedItems,
              tokens_used: stats.tokensUsed,
              error_message: stats.errors.length > 0 ? stats.errors.join('\n') : null,
              metadata: {
                totalChunks: stats.totalChunks,
                errors: stats.errors,
                usedAISDK: true,
                tables: {
                  sources: sourcesTableName,
                  chunks: chunksTableName,
                },
              },
            });
          } catch (trainingLogError) {
            console.error('Failed to save training log:', trainingLogError);
          }

          // Svuota pending_changes solo se non ci sono errori CRITICI
          if (stats.processedItems > 0) {
            await supabase
              .from('rags')
              .update({
                pending_changes: [] as any,
                updated_at: new Date().toISOString(),
              })
              .eq('id', ragId)
              .eq('user_id', user.id);

            sendMessage('cleared', { message: 'Pending changes cleared' });
          }

          // Invia statistiche finali
          sendMessage('complete', {
            stats: {
              totalItems: stats.totalItems,
              processedItems: stats.processedItems,
              totalChunks: stats.totalChunks,
              tokensUsed: stats.tokensUsed,
              errorsCount: stats.errors.length,
              errors: stats.errors,
              dbStats,
            },
          });

        } catch (storageError: any) {
          await ragStorage.close().catch(() => {});
          sendMessage('error', {
            message: 'Storage error: ' + storageError.message,
          });
        }

      } catch (error: any) {
        sendMessage('error', {
          message: error.message || 'Internal server error',
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
