/**
 * Polar Webhook Handler
 *
 * Receives and processes webhook events from Polar for subscription lifecycle events.
 * Verifies webhook signatures and updates user subscription status in Convex.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * POST handler for Polar webhooks
 */
export async function POST(req: NextRequest) {
  try {
    // Get raw body for signature verification
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers.entries());

    // Verify webhook signature
    let event;
    try {
      event = validateEvent(
        payload,
        headers,
        process.env.POLAR_WEBHOOK_SECRET!
      );
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        console.error("Webhook signature verification failed:", error);
        return NextResponse.json(
          { error: "Invalid webhook signature" },
          { status: 403 }
        );
      }
      throw error;
    }

    console.log("Received Polar webhook event:", event.type);

    // Handle different event types
    switch (event.type) {
      case "subscription.created":
        await handleSubscriptionCreated(event);
        break;

      case "subscription.updated":
        await handleSubscriptionUpdated(event);
        break;

      case "subscription.canceled":
      case "subscription.revoked":
        await handleSubscriptionCanceled(event);
        break;

      case "subscription.active":
        await handleSubscriptionActive(event);
        break;

      case "order.created":
        // Payment successful for new subscription
        await handleOrderCreated(event);
        break;

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }

    // Return 200 OK to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle subscription.created / subscription.activated events
 */
async function handleSubscriptionCreated(event: any) {
  const subscription = event.data;
  const userId = subscription.metadata?.clerkUserId;

  if (!userId) {
    console.error("No clerkUserId in subscription metadata");
    return;
  }

  const currentPeriodStart = new Date(subscription.current_period_start).getTime();
  const currentPeriodEnd = new Date(subscription.current_period_end).getTime();

  await convex.action(api.subscriptions.handleUpgrade, {
    userId,
    polarCustomerId: subscription.customer_id,
    polarSubscriptionId: subscription.id,
    billingCycleStart: currentPeriodStart,
    billingCycleEnd: currentPeriodEnd,
  });

  console.log(`User ${userId} upgraded to Pro tier`);
}

/**
 * Handle subscription.updated events
 */
async function handleSubscriptionUpdated(event: any) {
  const subscription = event.data;

  const currentPeriodStart = new Date(subscription.current_period_start).getTime();
  const currentPeriodEnd = new Date(subscription.current_period_end).getTime();

  await convex.action(api.subscriptions.updateBillingCycle, {
    polarSubscriptionId: subscription.id,
    billingCycleStart: currentPeriodStart,
    billingCycleEnd: currentPeriodEnd,
  });

  console.log(`Subscription ${subscription.id} updated`);
}

/**
 * Handle subscription.canceled / subscription.revoked events
 */
async function handleSubscriptionCanceled(event: any) {
  const subscription = event.data;

  // Update subscription status to cancelled
  await convex.action(api.subscriptions.updateSubscriptionStatus, {
    polarSubscriptionId: subscription.id,
    status: "cancelled",
  });

  // Note: We don't immediately downgrade the user.
  // They keep Pro access until the end of their billing period.
  // A scheduled job or the subscription.ended event will handle the actual downgrade.

  console.log(`Subscription ${subscription.id} cancelled (access until period end)`);
}

/**
 * Handle subscription.active events
 */
async function handleSubscriptionActive(event: any) {
  const subscription = event.data;

  await convex.action(api.subscriptions.updateSubscriptionStatus, {
    polarSubscriptionId: subscription.id,
    status: "active",
  });

  console.log(`Subscription ${subscription.id} is now active`);
}

/**
 * Handle order.created events (payment successful)
 */
async function handleOrderCreated(event: any) {
  const order = event.data;
  const userId = order.metadata?.clerkUserId;

  if (!userId) {
    console.error("No clerkUserId in order metadata");
    return;
  }

  console.log(`Payment successful for user ${userId}`);
  // Subscription will be handled by subscription.created event
}
