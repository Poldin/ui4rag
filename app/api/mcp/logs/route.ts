import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../lib/supabase-server';

/**
 * GET /api/mcp/logs?ragId=xxx&limit=50&offset=0
 * Lista tutti i log MCP per un RAG specifico
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ragId = searchParams.get('ragId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!ragId) {
      return NextResponse.json(
        { error: 'RAG ID is required' },
        { status: 400 }
      );
    }

    // Autenticazione
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verifica che il RAG appartenga all'utente
    const { data: ragData, error: ragError } = await supabase
      .from('rags')
      .select('id')
      .eq('id', ragId)
      .eq('user_id', user.id)
      .single();

    if (ragError || !ragData) {
      return NextResponse.json(
        { error: 'RAG not found or access denied' },
        { status: 404 }
      );
    }

    // Recupera i log per questo RAG con informazioni sulla chiave API
    const { data: logs, error: logsError } = await supabase
      .from('mcp_logs')
      .select(`
        id,
        created_at,
        metadata,
        origin,
        apikey_id,
        api_keys (
          id,
          name
        )
      `)
      .eq('rag_id', ragId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (logsError) {
      console.error('Error fetching MCP logs:', logsError);
      return NextResponse.json(
        { error: 'Failed to fetch MCP logs' },
        { status: 500 }
      );
    }

    // Conta il totale dei log
    const { count, error: countError } = await supabase
      .from('mcp_logs')
      .select('*', { count: 'exact', head: true })
      .eq('rag_id', ragId);

    if (countError) {
      console.error('Error counting MCP logs:', countError);
    }

    return NextResponse.json({
      success: true,
      logs: logs || [],
      total: count || 0,
    });

  } catch (error: any) {
    console.error('List MCP logs error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

