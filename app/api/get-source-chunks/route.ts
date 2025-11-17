import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase-server';
import { Pool } from 'pg';

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

    // Carica config RAG
    const { data: ragData, error: ragError } = await supabase
      .from('rags')
      .select('config')
      .eq('id', ragId)
      .eq('user_id', user.id)
      .single();

    if (ragError || !ragData) {
      return NextResponse.json(
        { error: 'RAG not found' },
        { status: 404 }
      );
    }

    const config = ragData.config as any;

    if (!config?.connectionString || !config?.chunksTableName || !config?.sourcesTableName) {
      return NextResponse.json(
        { error: 'RAG configuration incomplete', configMissing: true },
        { status: 400 }
      );
    }

    // Connessione al database configurato
    const pool = new Pool({
      connectionString: encodeConnectionString(config.connectionString),
      ssl: { rejectUnauthorized: false },
    });

    try {
      // Ottieni source info
      const sourceResult = await pool.query(
        `SELECT id, title, content, source_type, metadata, created_at
         FROM ${config.sourcesTableName}
         WHERE id = $1`,
        [sourceId]
      );

      if (sourceResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Source not found' },
          { status: 404 }
        );
      }

      const source = sourceResult.rows[0];

      // Ottieni tutti i chunks del source
      const chunksResult = await pool.query(
        `SELECT id, content, chunk_index, chunk_total, metadata, created_at
         FROM ${config.chunksTableName}
         WHERE source_id = $1
         ORDER BY chunk_index ASC`,
        [sourceId]
      );

      await pool.end();

      return NextResponse.json({
        source: {
          id: source.id,
          title: source.title,
          content: source.content,
          sourceType: source.source_type,
          metadata: source.metadata,
          createdAt: source.created_at,
        },
        chunks: chunksResult.rows.map((chunk: any) => ({
          id: chunk.id,
          content: chunk.content,
          chunkIndex: chunk.chunk_index,
          chunkTotal: chunk.chunk_total,
          metadata: chunk.metadata,
          createdAt: chunk.created_at,
        })),
        stats: {
          totalChunks: chunksResult.rows.length,
          sourceLength: source.content?.length || 0,
        },
      });
    } catch (dbError: any) {
      await pool.end().catch(() => {});
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Database query failed', details: dbError.message, connectionFailed: true },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Get source chunks error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

function encodeConnectionString(connStr: string): string {
  try {
    const url = new URL(connStr);
    if (url.password) {
      const decodedPassword = decodeURIComponent(url.password);
      const encodedPassword = encodeURIComponent(decodedPassword);
      url.password = encodedPassword;
      return url.toString();
    }
    return connStr;
  } catch (error) {
    return connStr;
  }
}

