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

    console.log('🔐 Checking Supabase credentials:', {
      hasUrl: !!supabaseUrl,
      urlPrefix: supabaseUrl?.substring(0, 20) + '...',
      hasServiceKey: !!supabaseServiceKey,
      serviceKeyPrefix: supabaseServiceKey?.substring(0, 15) + '...'
    });

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase credentials!', {
        NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
        SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey
      });
      throw new Error('Missing Supabase credentials');
    }

    console.log('✅ Creating Supabase admin client...');
    supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('✅ Supabase admin client created successfully');
  }
  
  return supabaseAdmin;
}

/**
 * Crea o recupera un utente Supabase da un evento 1Sub
 * Approccio ottimizzato: tenta di creare l'utente direttamente
 * 
 * @param oneSubUserId - ID utente da 1Sub
 * @param userEmail - Email dell'utente
 * @returns L'ID utente Supabase
 */
export async function syncUserFrom1Sub(
  oneSubUserId: string,
  userEmail: string
): Promise<string> {
  const startTime = Date.now();
  console.log('🔄 [SYNC START] Syncing user from 1Sub:', { oneSubUserId, userEmail });

  try {
    console.log('📡 [STEP 1/3] Getting Supabase admin client...');
    const supabase = getSupabaseAdmin();
    console.log('✅ [STEP 1/3] Supabase admin client ready');
    
    // Approccio ottimizzato: prova a creare l'utente direttamente
    // Se esiste già, gestisci l'errore e aggiorna i metadati
    console.log('➕ [STEP 2/3] Attempting to create user...');
    
    const createPayload = {
      email: userEmail,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        onesub_user_id: oneSubUserId,
        created_from: '1sub_webhook',
        created_at: new Date().toISOString(),
      }
    };
    
    console.log('📝 [STEP 2/3] Creating user with payload:', {
      email: userEmail,
      email_confirm: true,
      metadata_keys: Object.keys(createPayload.user_metadata)
    });
    
    const { data: newUserData, error: createError } = await supabase.auth.admin.createUser(createPayload);
    
    // Se la creazione ha avuto successo, ritorna il nuovo ID
    if (!createError && newUserData?.user) {
      const duration = Date.now() - startTime;
      console.log(`✅ [SYNC COMPLETE] New user created in ${duration}ms:`, {
        id: newUserData.user.id,
        email: newUserData.user.email
      });
      return newUserData.user.id;
    }
    
    // Se l'errore indica che l'utente esiste già
    if (createError && (createError.message?.includes('already') || createError.message?.includes('exists') || createError.status === 422)) {
      console.log('ℹ️ [STEP 2/3] User already exists, fetching by email...');
      
      // Cerca l'utente esistente
      console.log('🔍 [STEP 3/3] Listing users to find existing user...');
      const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error('❌ [STEP 3/3] Error listing users:', listError);
        throw listError;
      }
      
      console.log(`📋 [STEP 3/3] Found ${usersData.users.length} total users, searching for ${userEmail}...`);
      const existingUser = usersData.users.find(u => u.email === userEmail);
      
      if (!existingUser) {
        console.error('❌ [STEP 3/3] User should exist but not found!');
        throw new Error(`User ${userEmail} should exist but was not found`);
      }
      
      console.log('✅ [STEP 3/3] Found existing user:', existingUser.id);
      
      // Aggiorna i metadati dell'utente esistente
      console.log('🔄 [STEP 3/3] Updating existing user metadata with oneSubUserId...');
      const updateResult = await supabase.auth.admin.updateUserById(existingUser.id, {
        user_metadata: {
          ...existingUser.user_metadata,
          onesub_user_id: oneSubUserId,
        }
      });
      
      if (updateResult.error) {
        console.error('⚠️ [STEP 3/3] Error updating user metadata:', updateResult.error);
      } else {
        console.log('✅ [STEP 3/3] User metadata updated successfully');
      }

      const duration = Date.now() - startTime;
      console.log(`✅ [SYNC COMPLETE] Existing user synced in ${duration}ms:`, existingUser.id);
      return existingUser.id;
    }
    
    // Altri tipi di errore
    console.error('❌ [STEP 2/3] Unexpected error creating user:', {
      error: createError,
      message: createError?.message,
      status: createError?.status,
      code: createError?.code
    });
    throw createError || new Error('Unknown error creating user');

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌❌❌ [SYNC FAILED] Error syncing user from 1Sub after ${duration}ms:`, {
      message: error?.message,
      name: error?.name,
      status: error?.status,
      stack: error?.stack,
      oneSubUserId,
      userEmail
    });
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
