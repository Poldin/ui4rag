import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/1sub/webhook-signature';
import { WebhookEvent } from '@/lib/1sub/types';
import {
  handleSubscriptionActivated,
  handleSubscriptionUpdated,
  handleSubscriptionCanceled,
  handlePurchaseCompleted,
  handleCreditLow,
  handleCreditDepleted,
  handleToolStatusChanged,
  handleEntitlementRevoked,
} from '@/lib/1sub/webhook-handlers';


// Store processed event IDs to prevent duplicate processing
// In production, use Redis or a database instead of in-memory storage
const processedEvents = new Set<string>();

// Maximum events to keep in memory (simple LRU simulation)
const MAX_PROCESSED_EVENTS = 10000;

export async function POST(request: NextRequest) {
  try {
    // Get webhook secret from environment
    const webhookSecret = process.env.ONESUB_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('ONESUB_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Get signature from header
    const signature = request.headers.get('x-1sub-signature');
    
    if (!signature) {
      console.error('Missing x-1sub-signature header');
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 401 }
      );
    }

    // Read raw body
    const rawBody = await request.text();
    
    // Verify signature
    const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
    
    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Parse event
    const event: WebhookEvent = JSON.parse(rawBody);

    // Check for duplicate events (idempotency)
    if (processedEvents.has(event.id)) {
      console.log(`Duplicate event ${event.id}, skipping`);
      return NextResponse.json({ received: true });
    }

    // Add to processed events
    processedEvents.add(event.id);
    
    // Simple LRU: if we have too many events, clear half
    if (processedEvents.size > MAX_PROCESSED_EVENTS) {
      const toDelete = Array.from(processedEvents).slice(0, MAX_PROCESSED_EVENTS / 2);
      toDelete.forEach(id => processedEvents.delete(id));
    }

    // Log event
    console.log('📨 Webhook received:', {
      id: event.id,
      type: event.type,
      created: new Date(event.created * 1000).toISOString(),
    });

    // Process event asynchronously (don't await - respond immediately)
    processWebhookAsync(event).catch(error => {
      console.error('❌❌❌ CRITICAL ERROR processing webhook:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        eventId: event.id,
        eventType: event.type,
      });
    });

    // Acknowledge receipt immediately
    return NextResponse.json({ received: true }, { status: 200 });
    
  } catch (error) {
    console.error('Webhook endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Process webhook event asynchronously
 */
async function processWebhookAsync(event: WebhookEvent) {
  const startTime = Date.now();
  console.log(`⚙️ [PROCESS] Starting async processing for event ${event.id}`);
  
  try {
    console.log(`🎯 [PROCESS] Event type: ${event.type}`);
    
    switch (event.type) {
      case 'subscription.activated':
        console.log('📍 [PROCESS] Calling handleSubscriptionActivated...');
        await handleSubscriptionActivated(event, event.data as any);
        console.log('✅ [PROCESS] handleSubscriptionActivated completed');
        break;
        
      case 'subscription.updated':
        console.log('📍 [PROCESS] Calling handleSubscriptionUpdated...');
        await handleSubscriptionUpdated(event, event.data as any);
        console.log('✅ [PROCESS] handleSubscriptionUpdated completed');
        break;
        
      case 'subscription.canceled':
        console.log('📍 [PROCESS] Calling handleSubscriptionCanceled...');
        await handleSubscriptionCanceled(event, event.data as any);
        console.log('✅ [PROCESS] handleSubscriptionCanceled completed');
        break;
        
      case 'purchase.completed':
        console.log('📍 [PROCESS] Calling handlePurchaseCompleted...');
        await handlePurchaseCompleted(event, event.data as any);
        console.log('✅ [PROCESS] handlePurchaseCompleted completed');
        break;
        
      case 'user.credit_low':
        console.log('📍 [PROCESS] Calling handleCreditLow...');
        await handleCreditLow(event, event.data as any);
        console.log('✅ [PROCESS] handleCreditLow completed');
        break;
        
      case 'user.credit_depleted':
        console.log('📍 [PROCESS] Calling handleCreditDepleted...');
        await handleCreditDepleted(event, event.data as any);
        console.log('✅ [PROCESS] handleCreditDepleted completed');
        break;
        
      case 'tool.status_changed':
        console.log('📍 [PROCESS] Calling handleToolStatusChanged...');
        await handleToolStatusChanged(event, event.data as any);
        console.log('✅ [PROCESS] handleToolStatusChanged completed');
        break;
        
      case 'entitlement.revoked':
        console.log('📍 [PROCESS] Calling handleEntitlementRevoked...');
        await handleEntitlementRevoked(event, event.data as any);
        console.log('✅ [PROCESS] handleEntitlementRevoked completed');
        break;
        
      default:
        console.warn(`⚠️ [PROCESS] Unknown event type: ${event.type}`);
    }
    
    const duration = Date.now() - startTime;
    console.log(`✅✅✅ [PROCESS COMPLETE] Event ${event.id} processed successfully in ${duration}ms`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌❌❌ [PROCESS FAILED] Error processing event ${event.id} after ${duration}ms:`, {
      eventType: event.type,
      errorName: error?.name,
      errorMessage: error?.message,
      errorStack: error?.stack
    });
    throw error;
  }
}

