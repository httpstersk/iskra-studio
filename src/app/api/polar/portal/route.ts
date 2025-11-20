/**
 * Polar Customer Portal API Route
 *
 * Creates a customer portal session for managing existing subscriptions.
 * Redirects users to Polar-hosted portal for billing management.
 */

import { getErrorMessage, isErr, tryPromise } from "@/lib/errors/safe-errors";
import { polar } from "@/lib/polar";
import { createRateLimiter, shouldLimitRequest } from "@/lib/ratelimit";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextRequest, NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Rate limiter for portal session creation
 * Prevents abuse while allowing legitimate access
 */
const portalRateLimiter = {
  perMinute: createRateLimiter(5, "1 m"), // 5 requests per minute
  perHour: createRateLimiter(20, "1 h"), // 20 requests per hour
  perDay: createRateLimiter(50, "1 d"), // 50 requests per day
};

export async function POST(req: NextRequest) {
  // Verify authentication
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Apply rate limiting per user to prevent abuse
  const rateLimitResult = await tryPromise(
    shouldLimitRequest(portalRateLimiter, userId, "polar-portal")
  );

  if (isErr(rateLimitResult)) {
    console.error("Rate limit check failed:", getErrorMessage(rateLimitResult));
    // Fail open or closed?
  } else if (rateLimitResult.shouldLimitRequest) {
    console.warn(`Portal session rate limit exceeded for user ${userId}`);
    return NextResponse.json(
      { error: "Too many portal session requests" },
      { status: 429 }
    );
  }

  // Get user's subscription status from Convex
  const subscriptionStatusResult = await tryPromise(
    convex.query(api.subscriptions.getSubscriptionStatus)
  );

  if (isErr(subscriptionStatusResult)) {
    console.error(
      "Failed to fetch subscription status:",
      getErrorMessage(subscriptionStatusResult)
    );
    return NextResponse.json(
      { error: "Failed to fetch subscription status" },
      { status: 500 }
    );
  }

  const subscriptionStatus = subscriptionStatusResult;

  if (!subscriptionStatus?.polarCustomerId) {
    return NextResponse.json(
      { error: "No Polar customer found" },
      { status: 404 }
    );
  }

  // Create customer portal session with Polar
  const sessionResult = await tryPromise(
    polar.customerSessions.create({
      customerId: subscriptionStatus.polarCustomerId,
    })
  );

  if (isErr(sessionResult)) {
    console.error(
      "Customer portal session creation error:",
      getErrorMessage(sessionResult)
    );
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }

  const session = sessionResult;

  // Validate session expiration (should be reasonable timeframe)
  const expiresAt = new Date(session.expiresAt);
  const now = new Date();
  const maxSessionDuration = 7 * 24 * 60 * 60 * 1000; // 7 days

  if (expiresAt < now) {
    console.error("Portal session already expired");
    return NextResponse.json(
      { error: "Session creation failed" },
      { status: 500 }
    );
  }

  if (expiresAt.getTime() - now.getTime() > maxSessionDuration) {
    console.warn("Portal session has unusually long expiration");
  }

  // Log portal session creation for audit trail
  console.log(
    `Portal session created for user ${userId}, expires: ${expiresAt.toISOString()}`
  );

  // Return only the portal URL to the client
  // The session token is embedded in the URL and doesn't need to be exposed separately
  // This reduces the risk of token interception
  return NextResponse.json({
    portalUrl: session.customerPortalUrl,
    expiresAt: session.expiresAt,
  });
}
