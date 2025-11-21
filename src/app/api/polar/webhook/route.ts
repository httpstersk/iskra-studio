/**
 * Polar Webhook Handler
 *
 * Receives and processes webhook events from Polar for subscription lifecycle events.
 * Verifies webhook signatures and updates user subscription status in Convex.
 */

import {
  getErrorMessage,
  isErr,
  tryPromise,
  trySync,
} from "@/lib/errors/safe-errors";
import { createRateLimiter, shouldLimitRequest } from "@/lib/ratelimit";
import {
  validateEvent,
  WebhookVerificationError,
} from "@polar-sh/sdk/webhooks";
import { ConvexHttpClient } from "convex/browser";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Rate limiter for webhook endpoint
 * Conservative limits to prevent abuse while allowing legitimate webhook bursts
 */
const webhookRateLimiter = {
  perMinute: createRateLimiter(100, "1 m"), // 100 requests per minute
  perHour: createRateLimiter(500, "1 h"), // 500 requests per hour
  perDay: createRateLimiter(2000, "1 d"), // 2000 requests per day
};

/**
 * Zod schemas for Polar webhook event validation
 *
 * These schemas validate the structure and content of webhook payloads
 * to prevent malformed data from causing errors or security issues.
 */

// Base subscription data schema
const subscriptionDataSchema = z.object({
  id: z.string(),
  customerId: z.string().optional(),
  currentPeriodStart: z.union([z.string(), z.date()]).optional(),
  currentPeriodEnd: z.union([z.string(), z.date()]).optional(),
  metadata: z
    .object({
      clerkUserId: z.string().optional(),
    })
    .optional(),
});

// Subscription created event
const subscriptionCreatedSchema = z.object({
  type: z.literal("subscription.created"),
  data: subscriptionDataSchema.extend({
    customerId: z.string(),
    currentPeriodStart: z.union([z.string(), z.date()]),
    currentPeriodEnd: z.union([z.string(), z.date()]),
    metadata: z.object({
      clerkUserId: z.string(),
    }),
  }),
});

// Subscription updated event
const subscriptionUpdatedSchema = z.object({
  type: z.literal("subscription.updated"),
  data: subscriptionDataSchema.extend({
    currentPeriodStart: z.union([z.string(), z.date()]),
    currentPeriodEnd: z.union([z.string(), z.date()]),
  }),
});

// Subscription canceled event
const subscriptionCanceledSchema = z.object({
  type: z.literal("subscription.canceled"),
  data: subscriptionDataSchema,
});

// Subscription revoked event
const subscriptionRevokedSchema = z.object({
  type: z.literal("subscription.revoked"),
  data: subscriptionDataSchema,
});

// Subscription active event
const subscriptionActiveSchema = z.object({
  type: z.literal("subscription.active"),
  data: subscriptionDataSchema,
});

// Order created event
const orderCreatedSchema = z.object({
  type: z.literal("order.created"),
  data: z.object({
    id: z.string(),
    metadata: z
      .object({
        clerkUserId: z.string().optional(),
      })
      .optional(),
  }),
});

// Union of all event schemas
const polarWebhookEventSchema = z.discriminatedUnion("type", [
  subscriptionCreatedSchema,
  subscriptionUpdatedSchema,
  subscriptionCanceledSchema,
  subscriptionRevokedSchema,
  subscriptionActiveSchema,
  orderCreatedSchema,
]);

/**
 * POST handler for Polar webhooks
 */
export async function POST(req: NextRequest) {
  // Apply rate limiting to prevent abuse
  const ip =
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const rateLimitResult = await tryPromise(
    shouldLimitRequest(webhookRateLimiter, ip, "polar-webhook")
  );

  if (isErr(rateLimitResult)) {
    console.error("Rate limit check failed:", getErrorMessage(rateLimitResult));
    // Fail open or closed? Let's fail open for webhooks but log error, or maybe just continue.
    // Actually shouldLimitRequest probably doesn't throw, but let's be safe.
    // If it failed, we probably shouldn't block the webhook.
  } else if (rateLimitResult.shouldLimitRequest) {
    console.warn(`Webhook rate limit exceeded for IP ${ip}`);
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Get raw body for signature verification
  const payloadResult = await tryPromise(req.text());
  if (isErr(payloadResult)) {
    return NextResponse.json({ error: "Failed to read body" }, { status: 400 });
  }
  const payload = payloadResult;
  const headers = Object.fromEntries(req.headers.entries());

  // Verify webhook signature
  const eventResult = trySync(() =>
    validateEvent(payload, headers, process.env.POLAR_WEBHOOK_SECRET!)
  );

  if (isErr(eventResult)) {
    const error = eventResult.payload;
    if (error instanceof WebhookVerificationError) {
      console.error("Webhook signature verification failed:", error);
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 403 }
      );
    }
    console.error("Webhook validation error:", getErrorMessage(eventResult));
    return NextResponse.json(
      { error: "Webhook validation failed" },
      { status: 500 }
    );
  }

  const event = eventResult;

  // Validate event structure using Zod schemas
  const validationResult = polarWebhookEventSchema.safeParse(event);
  if (!validationResult.success) {
    console.error("Webhook event validation failed:", validationResult.error);
    return NextResponse.json(
      { error: "Invalid event structure" },
      { status: 400 }
    );
  }

  const validatedEvent = validationResult.data;
  const eventId = validatedEvent.data.id;

  // TODO: Enable replay attack protection after running `npx convex dev` to regenerate types
  // The webhooks module exists in convex/webhooks.ts but isn't included in generated api types yet.
  // Uncomment below after types are regenerated:
  //
  // const alreadyProcessedResult = await tryPromise(
  //   convex.query(api.webhooks.isEventProcessed, { eventId })
  // );
  // if (isErr(alreadyProcessedResult)) {
  //   console.error("Failed to check if event processed:", getErrorMessage(alreadyProcessedResult));
  //   return NextResponse.json({ error: "Database error" }, { status: 500 });
  // }
  // if (alreadyProcessedResult) {
  //   console.log(`Event ${eventId} already processed, skipping (replay protection)`);
  //   return NextResponse.json({ received: true }, { status: 200 });
  // }

  // Handle different event types
  let handleResult;
  switch (validatedEvent.type) {
    case "subscription.created":
      handleResult = await tryPromise(
        handleSubscriptionCreated(validatedEvent)
      );
      break;

    case "subscription.updated":
      handleResult = await tryPromise(
        handleSubscriptionUpdated(validatedEvent)
      );
      break;

    case "subscription.canceled":
    case "subscription.revoked":
      handleResult = await tryPromise(
        handleSubscriptionCanceled(validatedEvent)
      );
      break;

    case "subscription.active":
      handleResult = await tryPromise(handleSubscriptionActive(validatedEvent));
      break;

    case "order.created":
      // Payment successful for new subscription
      handleResult = await tryPromise(handleOrderCreated(validatedEvent));
      break;

    default:
      // TypeScript exhaustiveness check - this should never be reached
      const _exhaustive: never = validatedEvent;
      console.log(`Unhandled webhook event type: ${_exhaustive}`);
      handleResult = null; // Or success
  }

  if (isErr(handleResult)) {
    console.error(
      `Failed to handle event ${validatedEvent.type}:`,
      getErrorMessage(handleResult)
    );
    return NextResponse.json(
      { error: "Event processing failed" },
      { status: 500 }
    );
  }

  // TODO: Mark event as processed after types are regenerated (see TODO above)
  // const markResult = await tryPromise(
  //   convex.mutation(api.webhooks.markEventProcessed, {
  //     eventId,
  //     eventType: validatedEvent.type,
  //     source: "polar",
  //   })
  // );
  // if (isErr(markResult)) {
  //   console.error("Failed to mark event as processed:", getErrorMessage(markResult));
  // }

  // Return 200 OK to acknowledge receipt
  return NextResponse.json({ received: true }, { status: 200 });
}

// Legacy interface for backward compatibility with existing handler functions
interface PolarEvent {
  type: string;
  data: {
    id: string;
    customerId?: string;
    currentPeriodStart?: string | Date;
    currentPeriodEnd?: string | Date;
    metadata?: {
      clerkUserId?: string;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
}

/**
 * Handle subscription.created / subscription.activated events
 */
async function handleSubscriptionCreated(event: PolarEvent) {
  const subscription = event.data;
  const userId = subscription.metadata?.clerkUserId;

  if (!userId) {
    console.error("No clerkUserId in subscription metadata");
    return;
  }

  if (
    !subscription.currentPeriodStart ||
    !subscription.currentPeriodEnd ||
    !subscription.customerId
  ) {
    console.error("Missing billing period dates or customer ID");
    return;
  }

  const currentPeriodStart = new Date(
    subscription.currentPeriodStart
  ).getTime();
  const currentPeriodEnd = new Date(subscription.currentPeriodEnd).getTime();

  await convex.action(api.subscriptions.handleUpgrade, {
    userId,
    polarCustomerId: subscription.customerId,
    polarSubscriptionId: subscription.id,
    billingCycleStart: currentPeriodStart,
    billingCycleEnd: currentPeriodEnd,
  });

  console.log(`User ${userId} upgraded to Pro tier`);
}

/**
 * Handle subscription.updated events
 */
async function handleSubscriptionUpdated(event: PolarEvent) {
  const subscription = event.data;

  if (!subscription.currentPeriodStart || !subscription.currentPeriodEnd) {
    console.error("Missing billing period dates");
    return;
  }

  const currentPeriodStart = new Date(
    subscription.currentPeriodStart
  ).getTime();
  const currentPeriodEnd = new Date(subscription.currentPeriodEnd).getTime();

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
async function handleSubscriptionCanceled(event: PolarEvent) {
  const subscription = event.data;

  // Update subscription status to cancelled
  await convex.action(api.subscriptions.updateSubscriptionStatus, {
    polarSubscriptionId: subscription.id,
    status: "cancelled",
  });

  // Note: We don't immediately downgrade the user.
  // They keep Pro access until the end of their billing period.
  // A scheduled job or the subscription.ended event will handle the actual downgrade.

  console.log(
    `Subscription ${subscription.id} cancelled (access until period end)`
  );
}

/**
 * Handle subscription.active events
 */
async function handleSubscriptionActive(event: PolarEvent) {
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
async function handleOrderCreated(event: PolarEvent) {
  const order = event.data;
  const userId = order.metadata?.clerkUserId;

  if (!userId) {
    console.error("No clerkUserId in order metadata");
    return;
  }

  console.log(`Payment successful for user ${userId}`);
  // Subscription will be handled by subscription.created event
}
