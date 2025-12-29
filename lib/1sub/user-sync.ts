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
    console.log('📡 [STEP 1/5] Getting Supabase admin client...');
    const supabase = getSupabaseAdmin();
    console.log('✅ [STEP 1/5] Supabase admin client ready');
    
    // 1. Controlla se esiste già un utente con questa email
    console.log('🔍 [STEP 2/5] Listing existing users from Supabase Auth...');
    let listResult;
    try {
      listResult = await supabase.auth.admin.listUsers();
      console.log('✅ [STEP 2/5] listUsers() completed');
    } catch (listErr) {
      console.error('❌ [STEP 2/5] FAILED to list users:', listErr);
      throw listErr;
    }
    
    const { data: existingUsers, error: listError } = listResult;
    
    if (listError) {
      console.error('❌ [STEP 2/5] Error in listUsers response:', {
        error: listError,
        message: listError.message,
        status: listError.status
      });
      throw listError;
    }

    console.log(`📋 [STEP 3/5] Found ${existingUsers.users.length} total users in Supabase Auth`);
    console.log(`🔍 [STEP 3/5] Searching for email: ${userEmail}...`);
    const existingUser = existingUsers.users.find(u => u.email === userEmail);

    if (existingUser) {
      console.log('✅ [STEP 3/5] User already exists!', {
        id: existingUser.id,
        email: existingUser.email,
        hasOneSubId: !!existingUser.user_metadata?.onesub_user_id
      });
      
      console.log('🔄 [STEP 4/5] Updating user metadata with oneSubUserId...');
      try {
        const updateResult = await supabase.auth.admin.updateUserById(existingUser.id, {
          user_metadata: {
            ...existingUser.user_metadata,
            onesub_user_id: oneSubUserId,
          }
        });
        
        if (updateResult.error) {
          console.error('❌ [STEP 4/5] Error updating user metadata:', updateResult.error);
        } else {
          console.log('✅ [STEP 4/5] User metadata updated successfully');
        }
      } catch (updateErr) {
        console.error('❌ [STEP 4/5] Exception updating user:', updateErr);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ [SYNC COMPLETE] Existing user synced in ${duration}ms:`, existingUser.id);
      return existingUser.id;
    }

    // 2. Crea nuovo utente se non esiste
    console.log('➕ [STEP 4/5] User NOT found, creating new user...');
    console.log('📝 [STEP 4/5] Creating user with:', {
      email: userEmail,
      email_confirm: true,
      metadata_keys: ['onesub_user_id', 'created_from', 'created_at']
    });
    
    let createResult;
    try {
      createResult = await supabase.auth.admin.createUser({
        email: userEmail,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          onesub_user_id: oneSubUserId,
          created_from: '1sub_webhook',
          created_at: new Date().toISOString(),
        }
      });
      console.log('✅ [STEP 4/5] createUser() call completed');
    } catch (createErr) {
      console.error('❌ [STEP 4/5] FAILED to create user:', createErr);
      throw createErr;
    }

    const { data: newUser, error: createError } = createResult;

    if (createError) {
      console.error('❌ [STEP 4/5] Error in createUser response:', {
        error: createError,
        message: createError.message,
        status: createError.status
      });
      throw createError;
    }

    if (!newUser || !newUser.user) {
      console.error('❌ [STEP 4/5] No user data returned from createUser');
      throw new Error('No user data returned from createUser');
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [SYNC COMPLETE] New user created in ${duration}ms:`, {
      id: newUser.user.id,
      email: newUser.user.email
    });
    
    return newUser.user.id;

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

