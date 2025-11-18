import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../../../lib/supabase-server';
import { nanoid } from 'nanoid';
import * as bcrypt from 'bcryptjs';

/**
 * POST /api/mcp/keys/generate
 * Genera una nuova API key per accesso MCP
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ragId, name } = body;

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
      .select('id, name')
      .eq('id', ragId)
      .eq('user_id', user.id)
      .single();

    if (ragError || !ragData) {
      return NextResponse.json(
        { error: 'RAG not found or access denied' },
        { status: 404 }
      );
    }

    // Genera la API key (prefisso mcp_ + 32 caratteri random)
    const apiKey = `mcp_${nanoid(32)}`;
    
    // Hash della key per storage sicuro
    const keyHash = await bcrypt.hash(apiKey, 10);

    // Salva nel database
    const { data: keyData, error: insertError } = await supabase
      .from('api_keys')
      .insert({
        user_id: user.id,
        rag_id: ragId,
        key_hash: keyHash,
        name: name || null,
        is_active: true,
        scopes: ['read'],
        metadata: {
          created_by: 'web_ui',
          rag_name: ragData.name,
        },
      })
      .select('id, name, created_at, scopes')
      .single();

    if (insertError) {
      console.error('Error inserting API key:', insertError);
      return NextResponse.json(
        { error: 'Failed to create API key' },
        { status: 500 }
      );
    }

    // Ritorna la key in chiaro (UNICA volta che viene mostrata)
    return NextResponse.json({
      success: true,
      apiKey,  // Key in chiaro - salvare subito!
      keyInfo: {
        id: keyData.id,
        name: keyData.name,
        created_at: keyData.created_at,
        scopes: keyData.scopes,
      },
      warning: 'Save this API key now. It will not be shown again.',
    });

  } catch (error: any) {
    console.error('Generate API key error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

