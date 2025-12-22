import { 
  WebhookEvent, 
  SubscriptionActivatedData,
  SubscriptionUpdatedData,
  SubscriptionCanceledData,
  PurchaseCompletedData,
  CreditLowData,
  CreditDepletedData,
  ToolStatusChangedData
} from './types';
import { syncUserFrom1Sub, getSupabaseUserIdByOneSub } from './user-sync';
import { upsertSubscription, updateSubscriptionPlan, deactivateSubscription } from './subscription-db';

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
    const supabaseUserId = await syncUserFrom1Sub(
      data.oneSubUserId,
      data.userEmail
    );
    
    console.log('✅ User synced:', {
      oneSubUserId: data.oneSubUserId,
      supabaseUserId,
      email: data.userEmail,
    });

    // 2. Crea/aggiorna record nella tabella subscriptions
    await upsertSubscription(
      supabaseUserId,
      data.planId,
      true // is_active
    );

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
    const now = new Date();
    const effectiveDate = new Date(data.effectiveDate);
    
    if (effectiveDate <= now) {
      // Disattiva immediatamente
      console.log('🚫 Revoking access immediately');
      
      const supabaseUserId = await getSupabaseUserIdByOneSub(data.oneSubUserId);
      
      if (supabaseUserId) {
        await deactivateSubscription(supabaseUserId);
      }
      
      console.log('✅ Subscription deactivated');
    } else {
      // Disattiva alla fine del periodo
      console.log('⏰ Access will be revoked at:', effectiveDate);
      // TODO: Schedule deactivation
      // await scheduleDeactivation(data.oneSubUserId, effectiveDate);
    }
    
    // Send email based on cancellation reason
    if (data.cancellationReason === 'user_requested') {
      // TODO: await sendCancellationConfirmationEmail(data.userEmail, effectiveDate);
    } else if (data.cancellationReason === 'payment_failed') {
      // TODO: await sendPaymentFailedEmail(data.userEmail);
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

