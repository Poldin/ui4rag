import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyMagicLogin } from '@/lib/1sub/magic-login';
import type { Database } from '@/lib/database_types';

/**
 * Magic Login endpoint for 1Sub
 * 
 * When users click "Launch Magic Login" on 1Sub, they are redirected here.
 * We verify the signature and create a Supabase session.
 * 
 * URL: /auth/magic?user=xxx&ts=123&sig=HMAC
 */

// Supabase Admin client for user operations
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const baseUrl = request.nextUrl.origin;

  // 1. Extract and verify magic login parameters
  const params = {
    user: searchParams.get('user') || '',
    ts: searchParams.get('ts') || '',
    sig: searchParams.get('sig') || '',
  };

  console.log('🔐 [Magic Login] Received request:', {
    oneSubUserId: params.user,
    timestamp: params.ts,
    hasSignature: !!params.sig,
  });

  const verification = verifyMagicLogin(params);

  if (!verification.valid) {
    console.error('❌ [Magic Login] Verification failed:', verification.error);
    return NextResponse.redirect(
      new URL(`/signin?error=${encodeURIComponent(verification.error || 'Invalid magic link')}`, baseUrl)
    );
  }

  console.log('✅ [Magic Login] Signature verified for user:', verification.oneSubUserId);

  try {
    const supabase = getSupabaseAdmin();

    // 2. Find user by oneSubUserId in user_metadata
    console.log('🔍 [Magic Login] Looking up user...');
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      console.error('❌ [Magic Login] Error listing users:', listError);
      return NextResponse.redirect(
        new URL('/signin?error=Authentication+service+unavailable', baseUrl)
      );
    }

    const user = usersData.users.find(
      u => u.user_metadata?.onesub_user_id === verification.oneSubUserId
    );

    if (!user) {
      console.error('❌ [Magic Login] User not found for oneSubUserId:', verification.oneSubUserId);
      return NextResponse.redirect(
        new URL('/signin?error=User+not+found.+Please+subscribe+first+on+1Sub.', baseUrl)
      );
    }

    console.log('✅ [Magic Login] Found user:', { id: user.id, email: user.email });

    // 3. Check if user has an active subscription
    // Query the subscriptions table to verify active status
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('is_active, plan_id')
      .eq('user_id', user.id)
      .single();

    if (subError && subError.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('❌ [Magic Login] Error checking subscription:', subError);
    }

    if (!subscription?.is_active) {
      console.warn('⚠️ [Magic Login] User has no active subscription:', user.id);
      return NextResponse.redirect(
        new URL('/signin?error=Subscription+inactive.+Please+renew+on+1Sub.', baseUrl)
      );
    }

    console.log('✅ [Magic Login] User has active subscription:', subscription.plan_id);

    // 4. Generate a magic link for the user
    // This creates a one-time use link that will establish the Supabase session
    console.log('🔗 [Magic Login] Generating Supabase magic link...');
    
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: user.email!,
      options: {
        redirectTo: `${baseUrl}/app`,
      },
    });

    if (linkError || !linkData) {
      console.error('❌ [Magic Login] Error generating magic link:', linkError);
      return NextResponse.redirect(
        new URL('/signin?error=Failed+to+create+login+session', baseUrl)
      );
    }

    console.log('✅ [Magic Login] Magic link generated, redirecting...');

    // 5. The magic link contains a token in the hash - we need to redirect to verify endpoint
    // Extract the token from the generated URL and redirect to Supabase's verify endpoint
    const magicLinkUrl = new URL(linkData.properties.action_link);
    
    // Redirect to the magic link which will set up the session
    return NextResponse.redirect(magicLinkUrl.toString());

  } catch (error: any) {
    console.error('❌ [Magic Login] Unexpected error:', error);
    return NextResponse.redirect(
      new URL(`/signin?error=${encodeURIComponent('Authentication failed: ' + error.message)}`, baseUrl)
    );
  }
}

