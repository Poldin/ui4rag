/**
 * Sincronizzazione utenti tra 1Sub e Supabase
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database_types';

// Supabase Admin Client (lazy initialization)
let supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  
  return supabaseAdmin;
}

/**
 * Crea o recupera un utente Supabase da un evento 1Sub
 * 
 * @param oneSubUserId - ID utente da 1Sub
 * @param userEmail - Email dell'utente
 * @returns L'ID utente Supabase
 */
export async function syncUserFrom1Sub(
  oneSubUserId: string,
  userEmail: string
): Promise<string> {
  console.log('🔄 Syncing user from 1Sub:', { oneSubUserId, userEmail });

  try {
    const supabase = getSupabaseAdmin();
    
    // 1. Controlla se esiste già un utente con questa email
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }

    const existingUser = existingUsers.users.find(u => u.email === userEmail);

    if (existingUser) {
      console.log('✅ User already exists:', existingUser.id);
      
      // Salva o aggiorna il mapping in user_metadata
      await supabase.auth.admin.updateUserById(existingUser.id, {
        user_metadata: {
          ...existingUser.user_metadata,
          onesub_user_id: oneSubUserId,
        }
      });

      return existingUser.id;
    }

    // 2. Crea nuovo utente se non esiste
    console.log('➕ Creating new user for:', userEmail);
    
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: userEmail,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        onesub_user_id: oneSubUserId,
        created_from: '1sub_webhook',
        created_at: new Date().toISOString(),
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      throw createError;
    }

    console.log('✅ User created successfully:', newUser.user.id);
    return newUser.user.id;

  } catch (error) {
    console.error('❌ Error syncing user from 1Sub:', error);
    throw error;
  }
}

/**
 * Recupera l'ID utente Supabase da un oneSubUserId
 */
export async function getSupabaseUserIdByOneSub(
  oneSubUserId: string
): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) throw error;

    const user = users.users.find(
      u => u.user_metadata?.onesub_user_id === oneSubUserId
    );

    return user?.id || null;
  } catch (error) {
    console.error('Error getting Supabase user by 1Sub ID:', error);
    return null;
  }
}

/**
 * Recupera il oneSubUserId da un utente Supabase
 */
export async function getOneSubIdBySupabaseUser(
  supabaseUserId: string
): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data: user, error } = await supabase.auth.admin.getUserById(
      supabaseUserId
    );
    
    if (error) throw error;

    return user.user?.user_metadata?.onesub_user_id || null;
  } catch (error) {
    console.error('Error getting 1Sub ID by Supabase user:', error);
    return null;
  }
}

