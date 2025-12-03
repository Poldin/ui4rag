import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase-server';
import { RAGStorage, type RAGStorageConfig } from '../../../lib/ai-sdk/rag-storage';
import { createEmbeddingConfig } from '../../../lib/ai-sdk/embeddings';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ragId = searchParams.get('ragId');
    const sourceId = searchParams.get('sourceId');

    if (!ragId || !sourceId) {
      return NextResponse.json(
        { error: 'RAG ID and Source ID are required' },
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
      // Recupera il source completo
      const source = await ragStorage.getSource(sourceId);
      
      if (!source) {
        return NextResponse.json(
          { error: 'Source not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        id: source.id,
        title: source.title,
        content: source.content,
        source_type: source.source_type,
        metadata: source.metadata,
        created_at: source.created_at,
      });

    } catch (dbError: any) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch source', 
          details: dbError.message,
          connectionFailed: true 
        },
        { status: 500 }
      );
    } finally {
      await ragStorage.close();
    }

  } catch (error: any) {
    console.error('Get source error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}





