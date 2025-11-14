import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase-server';
import { RAGStorage, type RAGStorageConfig } from '../../../lib/ai-sdk/rag-storage';
import { createEmbeddingConfig } from '../../../lib/ai-sdk/embeddings';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ragId, query, limit = 5 } = body;

    console.log('🔍 Semantic Search Request:', { ragId, query, limit });

    if (!ragId || !query) {
      return NextResponse.json(
        { error: 'RAG ID and query are required' },
        { status: 400 }
      );
    }

    // Verifica autenticazione
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ Authentication error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Carica la configurazione RAG
    const { data: ragData, error: ragError } = await supabase
      .from('rags')
      .select('config')
      .eq('id', ragId)
      .eq('user_id', user.id)
      .single();

    if (ragError || !ragData) {
      console.error('❌ RAG config error:', ragError);
      return NextResponse.json(
        { error: 'RAG configuration not found' },
        { status: 404 }
      );
    }

    const config = ragData.config as any;

    console.log('📋 Config loaded:', {
      hasConnectionString: !!config?.connectionString,
      sourcesTableName: config?.sourcesTableName,
      chunksTableName: config?.chunksTableName,
      hasApiKey: !!config?.apiKey,
      embeddingModel: config?.embeddingModel,
      embeddingDimensions: config?.embeddingDimensions
    });

    // Verifica che la configurazione sia completa
    if (!config?.connectionString || !config?.sourcesTableName || !config?.chunksTableName || !config?.apiKey) {
      console.error('❌ Incomplete config:', {
        hasConnectionString: !!config?.connectionString,
        hasSourcesTableName: !!config?.sourcesTableName,
        hasChunksTableName: !!config?.chunksTableName,
        hasApiKey: !!config?.apiKey,
      });
      return NextResponse.json(
        { error: 'Database or OpenAI configuration incomplete', configMissing: true },
        { status: 400 }
      );
    }

    // Ottieni nomi delle tabelle dalla config
    const sourcesTableName = config.sourcesTableName || 'gimme_rag_sources';
    const chunksTableName = config.chunksTableName || 'gimme_rag_chunks';
    
    console.log('📊 Using tables:', { sources: sourcesTableName, chunks: chunksTableName });

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
      console.log('🤖 Generating embedding and searching with AI SDK...');

      // Esegui semantic search usando RAGStorage
      const searchResults = await ragStorage.search(query, limit, 0);

      console.log('✅ Search completed:', {
        resultsFound: searchResults.length,
        query,
      });

      // Log dettagli risultati
      searchResults.forEach((result, index) => {
        console.log(`📄 Result ${index + 1}:`, {
          sourceTitle: result.sourceTitle,
          similarity: result.similarity + '%',
          sourceType: result.sourceType,
          chunkIndex: `${result.chunkIndex + 1}/${result.chunkTotal}`,
        });
      });

      // Formatta risultati per compatibilità con UI esistente
      const formattedResults = searchResults.map((result) => ({
        id: result.chunkId,
        sourceId: result.sourceId,
        content: result.chunkContent,
        title: result.sourceTitle,
        similarity: result.similarity,
        source: result.sourceType,
        sourceUrl: result.metadata?.url || undefined,
        chunkIndex: result.chunkIndex,
        chunkTotal: result.chunkTotal,
        metadata: result.metadata,
      }));

      // Ottieni statistiche database
      const stats = await ragStorage.getStats();
      console.log('📊 Database statistics:', stats);

      return NextResponse.json({
        success: true,
        results: formattedResults,
        query,
        count: formattedResults.length,
        stats: {
          totalSources: stats.totalSources,
          totalChunks: stats.totalChunks,
        },
        usedAISDK: true,
      });

    } catch (searchError: any) {
      console.error('❌ Search error:', searchError);
      return NextResponse.json(
        { 
          error: 'Failed to perform search', 
          details: searchError.message,
        },
        { status: 500 }
      );
    } finally {
      await ragStorage.close();
    }

  } catch (error: any) {
    console.error('❌ Semantic search error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
