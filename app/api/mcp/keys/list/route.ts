import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../lib/supabase-server';

/**
 * GET /api/mcp/keys/list?ragId=xxx
 * Lista tutte le API keys per un RAG specifico
 */
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

    // Recupera tutte le keys per questo RAG
    const { data: keys, error: keysError } = await supabase
      .from('api_keys')
      .select('id, name, created_at, last_used_at, is_active, scopes, metadata')
      .eq('rag_id', ragId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (keysError) {
      console.error('Error fetching API keys:', keysError);
      return NextResponse.json(
        { error: 'Failed to fetch API keys' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      keys: keys || [],
    });

  } catch (error: any) {
    console.error('List API keys error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

