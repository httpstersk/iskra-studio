/**
 * Convex subscription management functions.
 *
 * Handles Polar subscription creation, status checks, and tier management.
 */

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, query } from "./_generated/server";

/**
 * Gets current user's subscription status
 *
 * Returns detailed subscription information including:
 * - Current tier
 * - Subscription status
 * - Billing cycle dates
 * - Polar customer and subscription IDs
 *
 * @returns Subscription details or null if not authenticated
 */
export const getSubscriptionStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const userId = identity.subject;

    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!user) {
      return null;
    }

    const plan = await ctx.db
      .query("plans")
      .withIndex("by_key", (q) => q.eq("key", user.tier === "paid" ? "pro" : user.tier))
      .first();

    const limits = {
      images: plan?.imagesPerPeriod ?? (user.tier === "pro" || user.tier === "paid" ? 480 : 24),
      videos: plan?.videosPerPeriod ?? (user.tier === "pro" || user.tier === "paid" ? 96 : 4),
    };

    return {
      billingCycleEnd: user.billingCycleEnd ?? null,
      billingCycleStart: user.billingCycleStart ?? null,
      imagesUsedInPeriod: user.imagesUsedInPeriod ?? 0,
      polarCustomerId: user.polarCustomerId ?? null,
      polarSubscriptionId: user.polarSubscriptionId ?? null,
      quotaLimits: limits,
      subscriptionStatus: user.subscriptionStatus ?? null,
      tier: user.tier,
      videosUsedInPeriod: user.videosUsedInPeriod ?? 0,
    };
  },
});

/**
 * Internal mutation to upgrade user to Pro tier
 *
 * Called by webhook handlers when a subscription is created/activated.
 * Updates user tier, sets billing cycle dates, and resets quota.
 *
 * @param userId - Clerk user ID
 * @param polarCustomerId - Polar customer ID
 * @param polarSubscriptionId - Polar subscription ID
 * @param billingCycleStart - Billing cycle start timestamp
 * @param billingCycleEnd - Billing cycle end timestamp
 */
export const handleUpgradeInternal = internalMutation({
  args: {
    userId: v.string(),
    polarCustomerId: v.string(),
    polarSubscriptionId: v.string(),
    billingCycleStart: v.number(),
    billingCycleEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!user) {
      throw new Error(`User not found: ${args.userId}`);
    }

    await ctx.db.patch(user._id, {
      tier: "pro",
      polarCustomerId: args.polarCustomerId,
      polarSubscriptionId: args.polarSubscriptionId,
      subscriptionStatus: "active",
      billingCycleStart: args.billingCycleStart,
      billingCycleEnd: args.billingCycleEnd,
      // Reset quota counters when upgrading
      imagesUsedInPeriod: 0,
      videosUsedInPeriod: 0,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Action wrapper to upgrade user to Pro tier
 */
export const handleUpgrade = action({
  args: {
    userId: v.string(),
    polarCustomerId: v.string(),
    polarSubscriptionId: v.string(),
    billingCycleStart: v.number(),
    billingCycleEnd: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation((internal as any).subscriptions.handleUpgradeInternal, args);
  },
});

/**
 * Internal mutation to downgrade user to Free tier
 *
 * Called by webhook handlers when a subscription is cancelled or expires.
 * Resets user to free tier and sets new billing cycle based on signup date.
 *
 * @param userId - Clerk user ID
 */
export const handleDowngrade = internalMutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!user) {
      throw new Error(`User not found: ${args.userId}`);
    }

    // Calculate new billing cycle start (user's signup date anniversary)
    const now = Date.now();
    const signupDate = new Date(user.createdAt);
    const currentDate = new Date(now);

    // Set billing cycle to monthly from signup date
    const billingCycleStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      signupDate.getDate()
    ).getTime();

    // If the day has already passed this month, move to next month
    const adjustedStart = billingCycleStart > now
      ? new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, signupDate.getDate()).getTime()
      : billingCycleStart;

    const billingCycleEnd = new Date(
      new Date(adjustedStart).getFullYear(),
      new Date(adjustedStart).getMonth() + 1,
      signupDate.getDate()
    ).getTime();

    await ctx.db.patch(user._id, {
      tier: "free",
      polarSubscriptionId: undefined,
      subscriptionStatus: undefined,
      billingCycleStart: adjustedStart,
      billingCycleEnd: billingCycleEnd,
      // Reset quota counters when downgrading
      imagesUsedInPeriod: 0,
      videosUsedInPeriod: 0,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Internal mutation to update subscription billing dates
 *
 * Called by webhook handlers when a subscription is renewed.
 *
 * @param polarSubscriptionId - Polar subscription ID
 * @param billingCycleStart - New billing cycle start timestamp
 * @param billingCycleEnd - New billing cycle end timestamp
 */
export const updateBillingCycleInternal = internalMutation({
  args: {
    polarSubscriptionId: v.string(),
    billingCycleStart: v.number(),
    billingCycleEnd: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_polarSubscriptionId", (q) =>
        q.eq("polarSubscriptionId", args.polarSubscriptionId)
      )
      .first();

    if (!user) {
      throw new Error(
        `User not found for subscription: ${args.polarSubscriptionId}`
      );
    }

    await ctx.db.patch(user._id, {
      billingCycleStart: args.billingCycleStart,
      billingCycleEnd: args.billingCycleEnd,
      // Reset quota counters on billing cycle renewal
      imagesUsedInPeriod: 0,
      videosUsedInPeriod: 0,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Action wrapper to update subscription billing dates
 */
export const updateBillingCycle = action({
  args: {
    polarSubscriptionId: v.string(),
    billingCycleStart: v.number(),
    billingCycleEnd: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation((internal as any).subscriptions.updateBillingCycleInternal, args);
  },
});

/**
 * Internal mutation to update subscription status
 *
 * Called by webhook handlers when subscription status changes.
 *
 * @param polarSubscriptionId - Polar subscription ID
 * @param status - New subscription status
 */
export const updateSubscriptionStatusInternal = internalMutation({
  args: {
    polarSubscriptionId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("cancelled"),
      v.literal("past_due"),
      v.literal("incomplete"),
      v.literal("trialing")
    ),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_polarSubscriptionId", (q) =>
        q.eq("polarSubscriptionId", args.polarSubscriptionId)
      )
      .first();

    if (!user) {
      throw new Error(
        `User not found for subscription: ${args.polarSubscriptionId}`
      );
    }

    await ctx.db.patch(user._id, {
      subscriptionStatus: args.status,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Action wrapper to update subscription status
 */
export const updateSubscriptionStatus = action({
  args: {
    polarSubscriptionId: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("cancelled"),
      v.literal("past_due"),
      v.literal("incomplete"),
      v.literal("trialing")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation((internal as any).subscriptions.updateSubscriptionStatusInternal, args);
  },
});

/**
 * Internal mutation to link Polar customer ID to user
 *
 * Called when creating a customer in Polar for the first time.
 *
 * @param userId - Clerk user ID
 * @param polarCustomerId - Polar customer ID
 */
export const linkPolarCustomerInternal = internalMutation({
  args: {
    userId: v.string(),
    polarCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!user) {
      throw new Error(`User not found: ${args.userId}`);
    }

    await ctx.db.patch(user._id, {
      polarCustomerId: args.polarCustomerId,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Action wrapper to link Polar customer ID to user
 */
export const linkPolarCustomer = action({
  args: {
    userId: v.string(),
    polarCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.runMutation((internal as any).subscriptions.linkPolarCustomerInternal, args);
  },
});

/**
 * Query to get user by Polar customer ID
 *
 * Used by webhook handlers to find users based on Polar events.
 *
 * @param polarCustomerId - Polar customer ID
 * @returns User record or null
 */
export const getUserByPolarCustomerId = query({
  args: {
    polarCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_polarCustomerId", (q) =>
        q.eq("polarCustomerId", args.polarCustomerId)
      )
      .first();

    return user ?? null;
  },
});
