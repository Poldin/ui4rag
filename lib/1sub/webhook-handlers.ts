import { 
  WebhookEvent, 
  SubscriptionActivatedData,
  SubscriptionUpdatedData,
  SubscriptionCanceledData,
  PurchaseCompletedData,
  CreditLowData,
  CreditDepletedData,
  ToolStatusChangedData,
  EntitlementRevokedData
} from './types';
import { syncUserFrom1Sub, getSupabaseUserIdByOneSub } from './user-sync';
import { upsertSubscription, updateSubscriptionPlan, deactivateSubscription, markSubscriptionCancelled } from './subscription-db';

/**
 * Handlers for each webhook event type.
 * Implement your business logic here.
 */

export async function handleSubscriptionActivated(
  event: WebhookEvent,
  data: SubscriptionActivatedData
) {
  console.log('🎉 Subscription Activated:', {
    userId: data.oneSubUserId,
    email: data.userEmail,
    plan: data.planId,
    status: data.status,
    trialEndsAt: data.trialEndsAt,
  });

  try {
    if (!data.userEmail) {
      console.warn('⚠️ No email provided in webhook data');
      return;
    }

    // 1. Crea o recupera l'utente Supabase
    console.log('🚀 Starting user sync...');
    const supabaseUserId = await syncUserFrom1Sub(
      data.oneSubUserId,
      data.userEmail
    );
    
    console.log('✅ User synced successfully:', {
      oneSubUserId: data.oneSubUserId,
      supabaseUserId: supabaseUserId,
      email: data.userEmail,
    });

    // 2. Crea/aggiorna record nella tabella subscriptions
    console.log('💾 Creating/updating subscription in DB...');
    const subscriptionData = await upsertSubscription(
      supabaseUserId,
      data.planId,
      true // is_active
    );
    
    console.log('💾 Subscription data saved:', subscriptionData);

    console.log('✅ Subscription created/updated:', {
      oneSubUserId: data.oneSubUserId,
      plan: data.planId,
      status: data.status,
    });

    // 3. TODO: Additional logic
    // - Send welcome email
    // if (data.status === 'trialing') {
    //   await sendTrialStartedEmail(data.userEmail);
    // } else {
    //   await sendWelcomeEmail(data.userEmail);
    // }
    
  } catch (error) {
    console.error('❌ Error handling subscription activated:', error);
    throw error;
  }
}

export async function handleSubscriptionUpdated(
  event: WebhookEvent,
  data: SubscriptionUpdatedData
) {
  console.log('🔄 Subscription Updated:', {
    userId: data.oneSubUserId,
    email: data.userEmail,
    currentPlan: data.planId,
    previousPlan: data.previousPlanId,
    currentStatus: data.status,
    previousStatus: data.previousStatus,
  });

  try {
    // Handle plan changes (upgrade/downgrade)
    if (data.previousPlanId && data.previousPlanId !== data.planId) {
      console.log(`📦 Plan changed: ${data.previousPlanId} → ${data.planId}`);
      
      // Trova l'utente Supabase dal oneSubUserId
      const supabaseUserId = await getSupabaseUserIdByOneSub(data.oneSubUserId);
      
      if (supabaseUserId) {
        await updateSubscriptionPlan(supabaseUserId, data.planId);
      }
      
      console.log('✅ Plan updated in database');
      
      // TODO: Send email notification
      // await sendPlanChangeEmail(data.userEmail, data.planId, data.previousPlanId);
    }
    
    // Handle trial conversion
    if (data.previousStatus === 'trialing' && data.status === 'active') {
      console.log('✨ Trial converted to paid subscription');
      // TODO: await sendTrialConvertedEmail(data.userEmail);
    }
    
    // Handle renewals
    if (!data.previousPlanId && data.status === 'active') {
      console.log('🔄 Subscription renewed');
    }
    
  } catch (error) {
    console.error('❌ Error handling subscription updated:', error);
    throw error;
  }
}

export async function handleSubscriptionCanceled(
  event: WebhookEvent,
  data: SubscriptionCanceledData
) {
  console.log('❌ Subscription Canceled:', {
    userId: data.oneSubUserId,
    email: data.userEmail,
    plan: data.planId,
    reason: data.cancellationReason,
    effectiveDate: data.effectiveDate,
  });

  try {
    // Trova l'utente Supabase
    console.log('🔍 Looking up user by 1Sub ID:', data.oneSubUserId);
    let supabaseUserId = await getSupabaseUserIdByOneSub(data.oneSubUserId);
    
    // Se non trovato per oneSubUserId, prova a sincronizzare con l'email
    if (!supabaseUserId && data.userEmail) {
      console.log('⚠️ User not found by 1Sub ID, trying to sync by email...');
      supabaseUserId = await syncUserFrom1Sub(data.oneSubUserId, data.userEmail);
    }
    
    if (!supabaseUserId) {
      console.error('❌ Cannot find or create user for cancellation');
      throw new Error(`User not found: ${data.oneSubUserId}`);
    }
    
    console.log('✅ Found user:', supabaseUserId);
    
    const now = new Date();
    const effectiveDate = data.effectiveDate ? new Date(data.effectiveDate) : null;
    const isValidFutureDate = effectiveDate && !isNaN(effectiveDate.getTime()) && effectiveDate > now;
    
    if (isValidFutureDate) {
      // Cancellazione programmata - l'accesso rimane attivo fino alla data
      console.log('📅 Scheduled cancellation - access remains until:', effectiveDate);
      await markSubscriptionCancelled(supabaseUserId, effectiveDate, data.cancellationReason);
      console.log('✅ Subscription marked for future cancellation');
    } else {
      // Disattiva immediatamente (no effectiveDate o data nel passato)
      console.log('🚫 Revoking access immediately');
      await deactivateSubscription(supabaseUserId);
      console.log('✅ Subscription deactivated immediately');
    }
    
    // Send email based on cancellation reason
    if (data.cancellationReason === 'user_requested') {
      // TODO: await sendCancellationConfirmationEmail(data.userEmail, effectiveDate);
      console.log('📧 TODO: Send cancellation confirmation email');
    } else if (data.cancellationReason === 'payment_failed') {
      // TODO: await sendPaymentFailedEmail(data.userEmail);
      console.log('📧 TODO: Send payment failed email');
    }
    
  } catch (error) {
    console.error('❌ Error handling subscription canceled:', error);
    throw error;
  }
}

export async function handlePurchaseCompleted(
  event: WebhookEvent,
  data: PurchaseCompletedData
) {
  // Non utilizzato - il prodotto funziona solo con subscription ricorrenti
  console.log('ℹ️ Purchase completed event received but not used (subscription-only product)');
}

export async function handleCreditLow(
  event: WebhookEvent,
  data: CreditLowData
) {
  // Non utilizzato - il prodotto funziona solo con subscription ricorrenti
  console.log('ℹ️ Credit low event received but not used (subscription-only product)');
}

export async function handleCreditDepleted(
  event: WebhookEvent,
  data: CreditDepletedData
) {
  // Non utilizzato - il prodotto funziona solo con subscription ricorrenti
  console.log('ℹ️ Credit depleted event received but not used (subscription-only product)');
}

export async function handleToolStatusChanged(
  event: WebhookEvent,
  data: ToolStatusChangedData
) {
  console.log('🔧 Tool Status Changed:', {
    toolId: data.toolId,
    active: data.toolStatus,
  });

  // TODO: Implement your logic
  // - Enable/disable maintenance mode
  // - Notify all active users
  // - Alert operations team
  
  if (!data.toolStatus) {
    console.log('⚠️ Tool suspended - entering maintenance mode');
    // await enableMaintenanceMode();
    // await notifyAllUsers({
    //   type: 'maintenance',
    //   message: 'Service temporarily unavailable. We\'ll be back shortly.',
    // });
    // await alertOps(`Tool ${data.toolId} suspended on 1Sub`);
  } else {
    console.log('✅ Tool reactivated');
    // await disableMaintenanceMode();
    // await notifyAllUsers({
    //   type: 'info',
    //   message: 'Service is back online!',
    // });
  }
}

export async function handleEntitlementRevoked(
  event: WebhookEvent,
  data: EntitlementRevokedData
) {
  console.log('🚫 Entitlement Revoked:', {
    userId: data.oneSubUserId,
    email: data.userEmail,
    reason: data.reason,
    revokedAt: data.revokedAt,
  });

  try {
    // Revoca immediata dell'accesso
    const supabaseUserId = await getSupabaseUserIdByOneSub(data.oneSubUserId);
    
    if (supabaseUserId) {
      await deactivateSubscription(supabaseUserId);
      console.log('✅ User access revoked immediately');
    } else {
      console.warn('⚠️ User not found in database');
    }
    
    // Log della motivazione per analisi
    if (data.reason === 'fraud' || data.reason === 'tos_violation') {
      console.warn('🔴 SECURITY EVENT:', {
        userId: data.oneSubUserId,
        reason: data.reason,
        timestamp: data.revokedAt,
      });
      // TODO: Alert security team
      // await alertSecurity({ userId: data.oneSubUserId, reason: data.reason });
    }
    
  } catch (error) {
    console.error('❌ Error handling entitlement revoked:', error);
    throw error;
  }
}

