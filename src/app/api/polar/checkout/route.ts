/**
 * Polar Checkout API Route
 *
 * Creates a Polar checkout session for upgrading to Pro subscription.
 * Redirects users to Polar-hosted checkout page.
 */

import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { polar, getProductIdForInterval, type BillingInterval } from "@/lib/polar";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await currentUser();
    if (!user || !user.emailAddresses[0]) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { billingInterval } = body as { billingInterval?: BillingInterval };

    if (!billingInterval || !["month", "year"].includes(billingInterval)) {
      return NextResponse.json(
        { error: "Invalid billing interval. Must be 'month' or 'year'" },
        { status: 400 }
      );
    }

    // Get product ID for the billing interval
    const productId = getProductIdForInterval(billingInterval);
    if (!productId) {
      return NextResponse.json(
        { error: "Product not configured for this billing interval" },
        { status: 500 }
      );
    }

    // Get or create Polar customer
    const email = user.emailAddresses[0].emailAddress;
    const customerName = user.fullName || email.split("@")[0];

    let polarCustomerId: string | undefined;

    // Check if user already has a Polar customer ID
    const subscriptionStatus = await convex.query(
      api.subscriptions.getSubscriptionStatus
    );

    if (subscriptionStatus?.polarCustomerId) {
      polarCustomerId = subscriptionStatus.polarCustomerId;
    } else {
      // Create new Polar customer
      try {
        const customer = await polar.customers.create({
          email,
          name: customerName,
          metadata: {
            clerkUserId: userId,
          },
        });

        polarCustomerId = customer.id;

        // Link Polar customer ID to user in Convex
        await convex.action(api.subscriptions.linkPolarCustomer, {
          userId,
          polarCustomerId,
        });
      } catch (error) {
        console.error("Failed to create Polar customer:", error);
        return NextResponse.json(
          { error: "Failed to create customer" },
          { status: 500 }
        );
      }
    }

    // Create checkout session
    const checkoutSession = await polar.checkouts.create({
      products: [productId],
      customerId: polarCustomerId,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/subscription/success`,
      metadata: {
        clerkUserId: userId,
        billingInterval,
      },
    });

    return NextResponse.json({
      checkoutUrl: checkoutSession.url,
      sessionId: checkoutSession.id,
    });
  } catch (error) {
    console.error("Checkout session creation error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
