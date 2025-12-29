/**
 * Gestione tabella subscriptions nel database
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database_types';

let supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey);
  }
  
  return supabaseAdmin;
}

/**
 * Metadata generico per la subscription (usato sia per activation che cancellation)
 */
export interface SubscriptionMetadata {
  // Info da 1Sub
  oneSubUserId?: string;
  userEmail?: string;
  planId?: string;
  productId?: string;
  status?: string;
  quantity?: number;
  
  // Info periodo
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialEndsAt?: string | null;
  
  // Info cancellazione
  cancellationReason?: string;
  effectiveDate?: string;
  canceledAt?: string;
  
  // Evento originale
  eventType?: string;
  eventId?: string;
  eventCreated?: string;
  
  // Dati extra
  [key: string]: any;
}

/**
 * Crea o aggiorna una subscription
 */
export async function upsertSubscription(
  supabaseUserId: string,
  planId: string,
  isActive: boolean = true,
  metadata?: SubscriptionMetadata
) {
  console.log('💾 [DB] Starting upsert subscription:', {
    userId: supabaseUserId,
    plan: planId,
    isActive,
    hasMetadata: !!metadata
  });

  try {
    const supabase = getSupabaseAdmin();

    console.log('💾 [DB] Executing upsert query...');
    const { data, error } = await (supabase as any)
      .from('subscriptions')
      .upsert({
        user_id: supabaseUserId,
        plan: planId,
        is_active: isActive,
        metadata: metadata || null,
        // Reset cancellation fields on activation
        cancelled_at: null,
        cancel_at: null,
      }, {
        onConflict: 'user_id',
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [DB] Error upserting subscription:', {
        error,
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log('✅ [DB] Subscription upserted successfully:', data);
    return data;
  } catch (err: any) {
    console.error('❌❌❌ [DB] Exception in upsertSubscription:', {
      message: err?.message,
      name: err?.name,
      stack: err?.stack
    });
    throw err;
  }
}

/**
 * Aggiorna il piano di una subscription
 */
export async function updateSubscriptionPlan(
  supabaseUserId: string,
  newPlanId: string,
  metadata?: SubscriptionMetadata
) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await (supabase as any)
    .from('subscriptions')
    .update({ 
      plan: newPlanId,
      metadata: metadata || undefined,
    })
    .eq('user_id', supabaseUserId)
    .select()
    .single();

  if (error) {
    console.error('Error updating subscription plan:', error);
    throw error;
  }
  
  return data;
}

/**
 * Disattiva una subscription immediatamente
 */
export async function deactivateSubscription(
  supabaseUserId: string,
  metadata?: SubscriptionMetadata
) {
  console.log('🚫 [DB] Deactivating subscription for user:', supabaseUserId);
  const supabase = getSupabaseAdmin();

  const now = new Date().toISOString();
  const { data, error } = await (supabase as any)
    .from('subscriptions')
    .update({ 
      is_active: false,
      cancelled_at: now,
      cancel_at: now,
      metadata: metadata || undefined,
    })
    .eq('user_id', supabaseUserId)
    .select()
    .single();

  if (error) {
    console.error('❌ [DB] Error deactivating subscription:', error);
    throw error;
  }
  
  console.log('✅ [DB] Subscription deactivated:', data);
  return data;
}

/**
 * Marca una subscription come cancellata (sarà disattivata in futuro)
 */
export async function markSubscriptionCancelled(
  supabaseUserId: string,
  cancelAt: Date,
  metadata?: SubscriptionMetadata
) {
  console.log('📅 [DB] Marking subscription as cancelled:', {
    userId: supabaseUserId,
    cancelAt: cancelAt.toISOString(),
    metadata
  });
  const supabase = getSupabaseAdmin();

  const { data, error } = await (supabase as any)
    .from('subscriptions')
    .update({ 
      cancelled_at: new Date().toISOString(),
      cancel_at: cancelAt.toISOString(),
      metadata: metadata || undefined,
      // is_active rimane true fino alla data di scadenza
    })
    .eq('user_id', supabaseUserId)
    .select()
    .single();

  if (error) {
    console.error('❌ [DB] Error marking subscription cancelled:', error);
    throw error;
  }
  
  console.log('✅ [DB] Subscription marked as cancelled:', data);
  return data;
}

/**
 * Verifica se un utente ha una subscription attiva
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await (supabase as any)
    .from('subscriptions')
    .select('is_active, cancel_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking subscription:', error);
    return false;
  }

  if (!data) return false;
  
  // Se c'è una data di cancellazione e siamo oltre quella data, non è attivo
  if (data.cancel_at && new Date(data.cancel_at) <= new Date()) {
    return false;
  }

  return true;
}
