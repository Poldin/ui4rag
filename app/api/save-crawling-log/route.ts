import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      ragId,
      startUrl,
      depth,
      pagesFound,
      executionTimeMs,
      stoppedManually,
      errorMessage,
      additionalMetadata 
    } = body;

    // Validazione input
    if (!startUrl) {
      return NextResponse.json(
        { error: 'Start URL is required' },
        { status: 400 }
      );
    }

    // Crea il client Supabase
    const supabase = await createServerSupabaseClient();

    // Verifica autenticazione
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Prepara i metadata
    const metadata = {
      startUrl,
      depth,
      pagesFound: pagesFound || 0,
      executionTimeMs,
      executionTimeSec: executionTimeMs ? (executionTimeMs / 1000).toFixed(2) : null,
      stoppedManually: stoppedManually || false,
      errorMessage: errorMessage || null,
      userId: user.id,
      ...additionalMetadata
    };

    // Salva il log nel database
    const { data, error } = await supabase
      .from('crawling_logs')
      .insert({
        rag_id: ragId || null,
        metadata
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving crawling log:', error);
      return NextResponse.json(
        { error: 'Failed to save crawling log' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      log: data
    });
  } catch (error: any) {
    console.error('Save crawling log error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

