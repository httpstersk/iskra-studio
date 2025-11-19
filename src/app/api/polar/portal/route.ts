/**
 * Polar Customer Portal API Route
 *
 * Creates a customer portal session for managing existing subscriptions.
 * Redirects users to Polar-hosted portal for billing management.
 */

import { polar } from "@/lib/polar";
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST() {
  try {
    // Verify authentication
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's subscription status from Convex
    const subscriptionStatus = await convex.query(
      api.subscriptions.getSubscriptionStatus
    );

    if (!subscriptionStatus?.polarCustomerId) {
      return NextResponse.json(
        { error: "No Polar customer found" },
        { status: 404 }
      );
    }

    // Create customer portal session
    const session = await polar.customerSessions.create({
      customerId: subscriptionStatus.polarCustomerId,
    });

    return NextResponse.json({
      portalUrl: session.customerPortalUrl,
      sessionToken: session.token,
      expiresAt: session.expiresAt,
    });
  } catch (error) {
    console.error("Customer portal session creation error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
