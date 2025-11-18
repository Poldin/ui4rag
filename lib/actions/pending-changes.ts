'use server';

import { createServerSupabaseClient } from '../supabase-server';
import { revalidatePath } from 'next/cache';

export interface PendingItem {
  id: string;
  type: "text" | "website" | "docs" | "qa" | "notion";
  title: string;
  preview: string;
  content: any; // Il contenuto completo per il training
  metadata?: {
    wordCount?: number;
    tokens?: number;
    [key: string]: any;
  };
  addedAt: string;
}

/**
 * Aggiunge nuovi elementi a pending_changes per un RAG specifico
 * Ogni item viene salvato come riga separata nella tabella pending_changes
 */
export async function addToPendingChanges(
  ragId: string,
  items: Omit<PendingItem, 'id' | 'addedAt'>[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    // Verifica autenticazione
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Verifica che il RAG esista e appartenga all'utente
    const { data: ragData, error: ragError } = await supabase
      .from('rags')
      .select('id')
      .eq('id', ragId)
      .eq('user_id', user.id)
      .single();

    if (ragError || !ragData) {
      return { success: false, error: 'RAG not found' };
    }

    // Crea i record nella tabella pending_changes
    const now = new Date().toISOString();
    const recordsToInsert = items.map(item => ({
      rag_id: ragId,
      content: {
        type: item.type,
        title: item.title,
        preview: item.preview,
        content: item.content,
        metadata: item.metadata || {},
      } as any,
      created_at: now,
      is_active: true,
    }));

    const { error: insertError } = await supabase
      .from('pending_changes')
      .insert(recordsToInsert);

    if (insertError) {
      console.error('Error inserting pending changes:', insertError);
      return { success: false, error: insertError.message };
    }

    // Revalida le rotte per aggiornare i dati cached
    revalidatePath(`/app/${ragId}/sources`);

    return { success: true };
  } catch (error: any) {
    console.error('Error adding to pending changes:', error);
    return { success: false, error: error.message || 'Internal server error' };
  }
}

/**
 * Recupera gli elementi pending per un RAG specifico
 * Legge dalla tabella pending_changes filtrando per rag_id e is_active=true
 */
export async function getPendingChanges(
  ragId: string
): Promise<{ success: boolean; items?: PendingItem[]; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    // Verifica autenticazione
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Verifica che il RAG esista e appartenga all'utente
    const { data: ragData, error: ragError } = await supabase
      .from('rags')
      .select('id')
      .eq('id', ragId)
      .eq('user_id', user.id)
      .single();

    if (ragError || !ragData) {
      return { success: false, error: 'RAG not found' };
    }

    // Carica pending_changes dalla tabella dedicata
    const { data: pendingRecords, error: pendingError } = await supabase
      .from('pending_changes')
      .select('id, content, created_at')
      .eq('rag_id', ragId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (pendingError) {
      console.error('Error fetching pending changes:', pendingError);
      return { success: false, error: pendingError.message };
    }

    // Trasforma i record in PendingItem[]
    // Filtra i record con content null e mappa solo quelli validi
    const items: PendingItem[] = (pendingRecords || [])
      .filter(record => record.content !== null)
      .map(record => {
        const content = record.content as {
          type: "text" | "website" | "docs" | "qa" | "notion";
          title: string;
          preview: string;
          content: any;
          metadata?: any;
        };
        return {
          id: record.id,
          type: content.type,
          title: content.title,
          preview: content.preview,
          content: content.content,
          metadata: content.metadata,
          addedAt: record.created_at,
        };
      });

    return { success: true, items };
  } catch (error: any) {
    console.error('Error getting pending changes:', error);
    return { success: false, error: error.message || 'Internal server error' };
  }
}

/**
 * Rimuove un singolo item da pending_changes
 * Soft delete: imposta is_active=false per conservare il dato
 */
export async function removeFromPendingChanges(
  ragId: string,
  itemId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    // Verifica autenticazione
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Verifica che il RAG esista e appartenga all'utente
    const { data: ragData, error: ragError } = await supabase
      .from('rags')
      .select('id')
      .eq('id', ragId)
      .eq('user_id', user.id)
      .single();

    if (ragError || !ragData) {
      return { success: false, error: 'RAG not found' };
    }

    // Soft delete: imposta is_active=false
    const { error: updateError } = await supabase
      .from('pending_changes')
      .update({ is_active: false })
      .eq('id', itemId)
      .eq('rag_id', ragId);

    if (updateError) {
      console.error('Error removing pending change:', updateError);
      return { success: false, error: updateError.message };
    }

    // Revalida le rotte
    revalidatePath(`/app/${ragId}/sources`);

    return { success: true };
  } catch (error: any) {
    console.error('Error removing from pending changes:', error);
    return { success: false, error: error.message || 'Internal server error' };
  }
}

/**
 * Svuota pending_changes dopo il training
 * Soft delete: imposta is_active=false per tutti i record del rag_id per conservare i dati
 */
export async function clearPendingChanges(
  ragId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient();

    // Verifica autenticazione
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Verifica che il RAG esista e appartenga all'utente
    const { data: ragData, error: ragError } = await supabase
      .from('rags')
      .select('id')
      .eq('id', ragId)
      .eq('user_id', user.id)
      .single();

    if (ragError || !ragData) {
      return { success: false, error: 'RAG not found' };
    }

    // Soft delete: imposta is_active=false per tutti i record attivi del rag_id
    const { error: updateError } = await supabase
      .from('pending_changes')
      .update({ is_active: false })
      .eq('rag_id', ragId)
      .eq('is_active', true);

    if (updateError) {
      console.error('Error clearing pending changes:', updateError);
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error clearing pending changes:', error);
    return { success: false, error: error.message || 'Internal server error' };
  }
}

