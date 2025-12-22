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
import { syncUserFrom1Sub } from './user-sync';

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
    // 1. Crea o recupera l'utente Supabase
    if (data.userEmail) {
      const supabaseUserId = await syncUserFrom1Sub(
        data.oneSubUserId,
        data.userEmail
      );
      
      console.log('✅ User synced:', {
        oneSubUserId: data.oneSubUserId,
        supabaseUserId,
        email: data.userEmail,
      });
    } else {
      console.warn('⚠️ No email provided in webhook data');
    }

    // 2. TODO: Additional logic
    // - Send welcome email
    // - Set up user resources
    // - Grant access to specific features based on planId
    
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

  // TODO: Implement your logic
  // - Update user's plan features
  // - Adjust usage limits
  // - Clear subscription cache
  // - Log plan changes
  
  // Handle plan changes
  if (data.previousPlanId && data.previousPlanId !== data.planId) {
    console.log(`Plan changed: ${data.previousPlanId} → ${data.planId}`);
    // await updateUserPlan(data.oneSubUserId, data.planId, data.previousPlanId);
  }
  
  // Handle trial conversion
  if (data.previousStatus === 'trialing' && data.status === 'active') {
    console.log('Trial converted to paid subscription');
    // await sendTrialConvertedEmail(data.userEmail);
  }
  
  // Handle renewals
  if (!data.previousPlanId && data.status === 'active') {
    console.log('Subscription renewed');
    // await logRenewal(data.oneSubUserId);
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

  // TODO: Implement your logic
  // - Revoke user access (immediately or at period end)
  // - Send cancellation email/survey
  // - Archive user data
  // - Clear subscription cache
  
  const now = new Date();
  const effectiveDate = new Date(data.effectiveDate);
  
  if (effectiveDate <= now) {
    console.log('Access revoked immediately');
    // await revokeUserAccess(data.oneSubUserId);
  } else {
    console.log('Access will be revoked at:', effectiveDate);
    // await scheduleAccessRevocation(data.oneSubUserId, effectiveDate);
  }
  
  // Send appropriate email based on cancellation reason
  if (data.cancellationReason === 'user_requested') {
    // await sendCancellationConfirmationEmail(data.userEmail, effectiveDate);
  } else if (data.cancellationReason === 'payment_failed') {
    // await sendPaymentFailedEmail(data.userEmail);
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

