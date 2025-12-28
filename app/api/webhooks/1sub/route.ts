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
    const signature = request.headers.get('X-1sub');
    
    if (!signature) {
      console.error('Missing X-1sub header');
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
      console.error('Error processing webhook:', error);
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
  try {
    switch (event.type) {
      case 'subscription.activated':
        await handleSubscriptionActivated(event, event.data as any);
        break;
        
      case 'subscription.updated':
        await handleSubscriptionUpdated(event, event.data as any);
        break;
        
      case 'subscription.canceled':
        await handleSubscriptionCanceled(event, event.data as any);
        break;
        
      case 'purchase.completed':
        await handlePurchaseCompleted(event, event.data as any);
        break;
        
      case 'user.credit_low':
        await handleCreditLow(event, event.data as any);
        break;
        
      case 'user.credit_depleted':
        await handleCreditDepleted(event, event.data as any);
        break;
        
      case 'tool.status_changed':
        await handleToolStatusChanged(event, event.data as any);
        break;
        
      case 'entitlement.revoked':
        await handleEntitlementRevoked(event, event.data as any);
        break;
        
      default:
        console.warn('Unknown event type:', event.type);
    }
    
    console.log(`✅ Event ${event.id} processed successfully`);
  } catch (error) {
    console.error(`❌ Error processing event ${event.id}:`, error);
    throw error;
  }
}

