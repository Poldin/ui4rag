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
 * Crea o aggiorna una subscription
 */
export async function upsertSubscription(
  supabaseUserId: string,
  planId: string,
  isActive: boolean = true
) {
  console.log('💾 [DB] Starting upsert subscription:', {
    userId: supabaseUserId,
    plan: planId,
    isActive
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
  newPlanId: string
) {
  const supabase = getSupabaseAdmin();

  const { error } = await (supabase as any)
    .from('subscriptions')
    .update({ plan: newPlanId })
    .eq('user_id', supabaseUserId);

  if (error) {
    console.error('Error updating subscription plan:', error);
    throw error;
  }
}

/**
 * Disattiva una subscription
 */
export async function deactivateSubscription(supabaseUserId: string) {
  const supabase = getSupabaseAdmin();

  const { error } = await (supabase as any)
    .from('subscriptions')
    .update({ is_active: false })
    .eq('user_id', supabaseUserId);

  if (error) {
    console.error('Error deactivating subscription:', error);
    throw error;
  }
}

/**
 * Verifica se un utente ha una subscription attiva
 */
export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await (supabase as any)
    .from('subscriptions')
    .select('is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error checking subscription:', error);
    return false;
  }

  return !!data;
}

