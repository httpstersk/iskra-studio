/**
 * Polar Checkout API Route
 *
 * Creates a Polar checkout session for upgrading to Pro subscription.
 * Redirects users to Polar-hosted checkout page.
 */

import { getErrorMessage, isErr, tryPromise } from "@/lib/errors/safe-errors";
import { logger } from "@/lib/logger";
import {
  getProductIdForInterval,
  polar,
  type BillingInterval,
} from "@/lib/polar";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextRequest, NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";

const log = logger.polar;

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  // Verify authentication
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await currentUser();
  if (!user || !user.emailAddresses[0]) {
    return NextResponse.json(
      { error: "User email not found" },
      { status: 400 },
    );
  }

  // Parse request body
  const bodyResult = await tryPromise(req.json());
  if (isErr(bodyResult)) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const { billingInterval } = bodyResult as {
    billingInterval?: BillingInterval;
  };

  if (!billingInterval || !["month", "year"].includes(billingInterval)) {
    return NextResponse.json(
      { error: "Invalid billing interval. Must be 'month' or 'year'" },
      { status: 400 },
    );
  }

  // Get product ID for the billing interval
  const productId = getProductIdForInterval(billingInterval);
  if (!productId) {
    return NextResponse.json(
      { error: "Product not configured for this billing interval" },
      { status: 500 },
    );
  }

  // Get or create Polar customer
  const email = user.emailAddresses[0].emailAddress;
  const customerName = user.fullName || email.split("@")[0];

  let polarCustomerId: string | undefined;

  // Check if user already has a Polar customer ID
  const subscriptionStatusResult = await tryPromise(
    convex.query(api.subscriptions.getSubscriptionStatus),
  );

  if (isErr(subscriptionStatusResult)) {
    log.error(
      "Failed to fetch subscription status",
      getErrorMessage(subscriptionStatusResult),
    );
    return NextResponse.json(
      { error: "Failed to fetch subscription status" },
      { status: 500 },
    );
  }

  const subscriptionStatus = subscriptionStatusResult;

  if (subscriptionStatus?.polarCustomerId) {
    polarCustomerId = subscriptionStatus.polarCustomerId;
  } else {
    // Create new Polar customer
    const customerResult = await tryPromise(
      polar.customers.create({
        email,
        name: customerName,
        metadata: {
          clerkUserId: userId,
        },
      }),
    );

    if (isErr(customerResult)) {
      log.error(
        "Failed to create Polar customer",
        getErrorMessage(customerResult),
      );
      return NextResponse.json(
        { error: "Failed to create customer" },
        { status: 500 },
      );
    }

    const customer = customerResult;
    polarCustomerId = customer.id;

    // Link Polar customer ID to user in Convex
    const linkResult = await tryPromise(
      convex.action(api.subscriptions.linkPolarCustomer, {
        userId,
        polarCustomerId,
      }),
    );

    if (isErr(linkResult)) {
      log.error("Failed to link Polar customer", getErrorMessage(linkResult));
    }
  }

  // Create checkout session
  const checkoutSessionResult = await tryPromise(
    polar.checkouts.create({
      products: [productId],
      customerId: polarCustomerId,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success`,
      metadata: {
        clerkUserId: userId,
        billingInterval,
      },
    }),
  );

  if (isErr(checkoutSessionResult)) {
    log.error(
      "Checkout session creation failed",
      getErrorMessage(checkoutSessionResult),
    );
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }

  const checkoutSession = checkoutSessionResult;

  return NextResponse.json({
    checkoutUrl: checkoutSession.url,
    sessionId: checkoutSession.id,
  });
}
