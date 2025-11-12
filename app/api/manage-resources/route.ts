import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase-server';
import { Pool } from 'pg';

// Funzione per fare URL-encoding della password nel connection string
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

    // Verifica che la configurazione sia completa
    if (!config?.connectionString || !config?.tableName) {
      return NextResponse.json(
        { error: 'Database configuration incomplete', configMissing: true },
        { status: 400 }
      );
    }

    // Connetti al database PostgreSQL configurato
    let pool: Pool | null = null;
    try {
      // Applica encoding automatico alla password
      const encodedConnectionString = encodeConnectionString(config.connectionString);
      
      pool = new Pool({
        connectionString: encodedConnectionString,
        ssl: encodedConnectionString.includes('supabase.co') || encodedConnectionString.includes('neon.tech')
          ? { rejectUnauthorized: false }
          : undefined,
      });

      // Test connessione
      await pool.query('SELECT 1');

      // Query per ottenere le risorse dalla tabella
      const result = await pool.query(
        `SELECT id, content, metadata, created_at 
         FROM ${config.tableName} 
         ORDER BY created_at DESC 
         LIMIT 1000`
      );

      return NextResponse.json({
        success: true,
        resources: result.rows,
        tableName: config.tableName,
        totalCount: result.rows.length
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
      if (pool) {
        await pool.end();
      }
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

    if (!config?.connectionString || !config?.tableName) {
      return NextResponse.json(
        { error: 'Database configuration incomplete' },
        { status: 400 }
      );
    }

    // Connetti al database PostgreSQL configurato
    let pool: Pool | null = null;
    try {
      // Applica encoding automatico alla password
      const encodedConnectionString = encodeConnectionString(config.connectionString);
      
      pool = new Pool({
        connectionString: encodedConnectionString,
        ssl: encodedConnectionString.includes('supabase.co') || encodedConnectionString.includes('neon.tech')
          ? { rejectUnauthorized: false }
          : undefined,
      });

      // Elimina le risorse
      const placeholders = resourceIds.map((_, i) => `$${i + 1}`).join(', ');
      const result = await pool.query(
        `DELETE FROM ${config.tableName} WHERE id IN (${placeholders})`,
        resourceIds
      );

      return NextResponse.json({
        success: true,
        deletedCount: result.rowCount || 0
      });

    } catch (dbError: any) {
      console.error('Database delete error:', dbError);
      return NextResponse.json(
        { error: 'Failed to delete resources', details: dbError.message },
        { status: 500 }
      );
    } finally {
      if (pool) {
        await pool.end();
      }
    }

  } catch (error: any) {
    console.error('Delete resources error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

