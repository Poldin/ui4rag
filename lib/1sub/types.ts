// 1Sub Webhook Event Types

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  created: number;
  data: EventData;
}

export type WebhookEventType =
  | 'subscription.activated'
  | 'subscription.updated'
  | 'subscription.canceled'
  | 'purchase.completed'
  | 'user.credit_low'
  | 'user.credit_depleted'
  | 'tool.status_changed'
  | 'entitlement.revoked';

// Base event data structure
interface BaseEventData {
  oneSubUserId: string;
  userEmail?: string;
}

// Subscription Events
export interface SubscriptionActivatedData extends BaseEventData {
  planId: string;
  productId: string;
  status: 'active' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  quantity?: number;
  creditsRemaining?: number;
  trialEndsAt?: string | null;
}

export interface SubscriptionUpdatedData extends BaseEventData {
  planId: string;
  previousPlanId?: string;
  productId: string;
  status: string;
  previousStatus?: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  quantity?: number;
  previousQuantity?: number;
}

export interface SubscriptionCanceledData extends BaseEventData {
  planId: string;
  productId: string;
  status: 'canceled';
  cancellationReason?: 'user_requested' | 'payment_failed' | 'trial_expired';
  effectiveDate: string;
  canceledAt: string;
}

// Purchase Event
export interface PurchaseCompletedData extends BaseEventData {
  checkoutId: string;
  amount: number;
  creditsRemaining?: number;
  purchaseType?: 'tool_access' | 'credits' | 'one_time';
}

// Credit Events
export interface CreditLowData extends BaseEventData {
  creditBalance: number;
  threshold: number;
}

export interface CreditDepletedData extends BaseEventData {
  creditBalance: 0;
}

// System Event
export interface ToolStatusChangedData {
  oneSubUserId: 'system';
  toolId: string;
  toolStatus: boolean;
}

// Entitlement Event
export interface EntitlementRevokedData extends BaseEventData {
  reason: 'subscription_ended' | 'user_revoked' | 'admin_revoked' | 'fraud' | 'tos_violation' | 'payment_failed';
  revokedAt: string;
  status: 'canceled';
}

// Union type for all event data
export type EventData =
  | SubscriptionActivatedData
  | SubscriptionUpdatedData
  | SubscriptionCanceledData
  | PurchaseCompletedData
  | CreditLowData
  | CreditDepletedData
  | ToolStatusChangedData
  | EntitlementRevokedData;

