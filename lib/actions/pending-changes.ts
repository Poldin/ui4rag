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

    // Carica il RAG corrente
    const { data: ragData, error: ragError } = await supabase
      .from('rags')
      .select('pending_changes')
      .eq('id', ragId)
      .eq('user_id', user.id)
      .single();

    if (ragError || !ragData) {
      return { success: false, error: 'RAG not found' };
    }

    // Ottieni pending_changes esistenti
    const existingPending = (ragData.pending_changes as unknown as PendingItem[]) || [];

    // Crea i nuovi item con ID e timestamp
    const now = new Date().toISOString();
    const newItems: PendingItem[] = items.map(item => ({
      ...item,
      id: `${item.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      addedAt: now,
    }));

    // Combina e aggiorna
    const updatedPending = [...existingPending, ...newItems];

    const { error: updateError } = await supabase
      .from('rags')
      .update({
        pending_changes: updatedPending as any,
        updated_at: now,
      })
      .eq('id', ragId)
      .eq('user_id', user.id);

    if (updateError) {
      return { success: false, error: updateError.message };
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

    // Carica pending_changes
    const { data: ragData, error: ragError } = await supabase
      .from('rags')
      .select('pending_changes')
      .eq('id', ragId)
      .eq('user_id', user.id)
      .single();

    if (ragError || !ragData) {
      return { success: false, error: 'RAG not found' };
    }

    const items = (ragData.pending_changes as unknown as PendingItem[]) || [];
    return { success: true, items };
  } catch (error: any) {
    console.error('Error getting pending changes:', error);
    return { success: false, error: error.message || 'Internal server error' };
  }
}

/**
 * Rimuove un singolo item da pending_changes
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

    // Carica pending_changes correnti
    const { data: ragData, error: ragError } = await supabase
      .from('rags')
      .select('pending_changes')
      .eq('id', ragId)
      .eq('user_id', user.id)
      .single();

    if (ragError || !ragData) {
      return { success: false, error: 'RAG not found' };
    }

    const existingPending = (ragData.pending_changes as unknown as PendingItem[]) || [];
    
    // Filtra rimuovendo l'item con l'ID specificato
    const updatedPending = existingPending.filter(item => item.id !== itemId);

    const { error: updateError } = await supabase
      .from('rags')
      .update({
        pending_changes: updatedPending as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ragId)
      .eq('user_id', user.id);

    if (updateError) {
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

    const { error: updateError } = await supabase
      .from('rags')
      .update({
        pending_changes: [] as any,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ragId)
      .eq('user_id', user.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error clearing pending changes:', error);
    return { success: false, error: error.message || 'Internal server error' };
  }
}

