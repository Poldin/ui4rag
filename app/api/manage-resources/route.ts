import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase-server';
import { RAGStorage, type RAGStorageConfig } from '../../../lib/ai-sdk/rag-storage';
import { createEmbeddingConfig } from '../../../lib/ai-sdk/embeddings';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ragId = searchParams.get('ragId');

    if (!ragId) {
      return NextResponse.json(
        { error: 'RAG ID is required' },
        { status: 400 }
      );
    }

    // Verifica autenticazione
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Carica la configurazione RAG
    const { data: ragData, error: ragError } = await supabase
      .from('rags')
      .select('config')
      .eq('id', ragId)
      .eq('user_id', user.id)
      .single();

    if (ragError || !ragData) {
      return NextResponse.json(
        { error: 'RAG configuration not found' },
        { status: 404 }
      );
    }

    const config = ragData.config as any;

    console.log('📋 Config loaded in manage-resources:', {
      hasConnectionString: !!config?.connectionString,
      sourcesTableName: config?.sourcesTableName,
      chunksTableName: config?.chunksTableName,
      hasApiKey: !!config?.apiKey,
    });

    // Verifica che la configurazione sia completa
    if (!config?.connectionString) {
      return NextResponse.json(
        { error: 'Database configuration incomplete', configMissing: true },
        { status: 400 }
      );
    }

    // Ottieni nomi delle tabelle dalla config
    const sourcesTableName = config.sourcesTableName || 'gimme_rag_sources';
    const chunksTableName = config.chunksTableName || 'gimme_rag_chunks';
    
    console.log('📊 Using tables:', { sourcesTableName, chunksTableName });

    // Configura RAGStorage
    const embeddingConfig = createEmbeddingConfig(
      config.apiKey || '',
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
      // Lista tutti i sources dalla tabella sources
      const sources = await ragStorage.listSources(1000, 0);
      
      console.log('✅ Sources loaded:', {
        count: sources.length,
        firstSource: sources[0] ? {
          id: sources[0].id,
          title: sources[0].title,
          source_type: sources[0].source_type,
        } : null,
      });

      // Ottieni il numero di chunks per ogni source
      const chunksCountMap = await ragStorage.getChunksCountBySource();

      // Ottieni statistiche
      const stats = await ragStorage.getStats();
      const sourcesByType = await ragStorage.countSourcesByType();
      
      console.log('📊 Stats:', stats);

      return NextResponse.json({
        success: true,
        resources: sources.map((source) => ({
          id: source.id,
          title: source.title,
          content: source.content.substring(0, 200) + '...', // Preview
          source_type: source.source_type,
          metadata: {
            ...source.metadata,
            source_type: source.source_type, // Assicura che source_type sia anche in metadata per compatibilità UI
            chunkCount: chunksCountMap.get(source.id) || 0, // Aggiungi il numero di chunks
          },
          created_at: source.created_at,
        })),
        stats: {
          totalSources: stats.totalSources,
          totalChunks: stats.totalChunks,
          chunksWithEmbeddings: stats.chunksWithEmbeddings,
          sourcesByType,
        },
        tables: {
          sources: sourcesTableName,
          chunks: chunksTableName,
        },
        usedAISDK: true,
      });

    } catch (dbError: any) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { 
          error: 'Failed to connect to database', 
          details: dbError.message,
          connectionFailed: true 
        },
        { status: 500 }
      );
    } finally {
      await ragStorage.close();
    }

  } catch (error: any) {
    console.error('Manage resources error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { ragId, resourceIds } = body;

    if (!ragId || !resourceIds || !Array.isArray(resourceIds)) {
      return NextResponse.json(
        { error: 'RAG ID and resource IDs are required' },
        { status: 400 }
      );
    }

    // Verifica autenticazione
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Carica la configurazione RAG
    const { data: ragData, error: ragError } = await supabase
      .from('rags')
      .select('config')
      .eq('id', ragId)
      .eq('user_id', user.id)
      .single();

    if (ragError || !ragData) {
      return NextResponse.json(
        { error: 'RAG configuration not found' },
        { status: 404 }
      );
    }

    const config = ragData.config as any;

    console.log('📋 Config loaded in DELETE:', {
      hasConnectionString: !!config?.connectionString,
      sourcesTableName: config?.sourcesTableName,
      chunksTableName: config?.chunksTableName,
      hasApiKey: !!config?.apiKey,
    });

    // Verifica che la configurazione sia completa
    if (!config?.connectionString) {
      return NextResponse.json(
        { error: 'Database configuration incomplete', configMissing: true },
        { status: 400 }
      );
    }

    // Ottieni nomi delle tabelle dalla config
    const sourcesTableName = config.sourcesTableName || 'gimme_rag_sources';
    const chunksTableName = config.chunksTableName || 'gimme_rag_chunks';
    
    console.log('📊 Using tables for DELETE:', { sourcesTableName, chunksTableName });

    // Configura RAGStorage
    const embeddingConfig = createEmbeddingConfig(
      config.apiKey || '',
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
      // Elimina tutti i sources (i chunks verranno eliminati automaticamente con CASCADE)
      let deletedCount = 0;
      for (const sourceId of resourceIds) {
        try {
          await ragStorage.deleteSource(sourceId);
          deletedCount++;
        } catch (deleteError) {
          console.error(`Failed to delete source ${sourceId}:`, deleteError);
        }
      }

      return NextResponse.json({
        success: true,
        deletedCount,
        usedAISDK: true,
      });

    } catch (dbError: any) {
      console.error('Database delete error:', dbError);
      return NextResponse.json(
        { error: 'Failed to delete resources', details: dbError.message },
        { status: 500 }
      );
    } finally {
      await ragStorage.close();
    }

  } catch (error: any) {
    console.error('Delete resources error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
