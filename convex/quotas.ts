/**
 * Convex quota management functions.
 *
 * Handles quota tracking, enforcement, and reset logic for image and video generations.
 */

import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get quota status for current user
 *
 * Returns usage and limits for both images and videos
 */
export const getQuotaStatus = query({
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

    // Fetch plan details
    const planKey = user.tier === "paid" ? "pro" : user.tier;
    const plan = await ctx.db
      .query("plans")
      .withIndex("by_key", (q) => q.eq("key", planKey))
      .first();

    const imageLimit = plan?.imagesPerPeriod ?? (planKey === "pro" ? 130 : 12);
    const videoLimit = plan?.videosPerPeriod ?? (planKey === "pro" ? 25 : 3);

    const now = Date.now();
    const imagesUsed = user.imagesUsedInPeriod ?? 0;
    const videosUsed = user.videosUsedInPeriod ?? 0;
    const effectiveBillingCycleStart = user.billingCycleStart ?? user.createdAt;

    return {
      billingCycleEnd:
        user.billingCycleEnd ??
        calculateNextBillingDate(effectiveBillingCycleStart),
      billingCycleStart: effectiveBillingCycleStart,
      daysUntilReset: user.billingCycleEnd
        ? Math.ceil((user.billingCycleEnd - now) / (1000 * 60 * 60 * 24))
        : 30,
      images: {
        limit: imageLimit,
        percentage: Math.min(100, Math.round((imagesUsed / imageLimit) * 100)),
        remaining: Math.max(0, imageLimit - imagesUsed),
        used: imagesUsed,
      },
      tier: user.tier,
      videos: {
        limit: videoLimit,
        percentage: Math.min(100, Math.round((videosUsed / videoLimit) * 100)),
        remaining: Math.max(0, videoLimit - videosUsed),
        used: videosUsed,
      },
    };
  },
});

/**
 * Atomically check and reserve quota for a generation
 *
 * This mutation combines quota checking and incrementing into a single atomic operation
 * to prevent race conditions where multiple parallel requests could exceed quota limits.
 *
 * @param type - Generation type ("image" or "video")
 * @param count - Number of items to reserve (default: 1)
 * @returns Object with success status and quota information
 * @throws Error if quota is exceeded or user not found
 */
export const checkAndReserveQuota = mutation({
  args: {
    type: v.union(v.literal("image"), v.literal("video")),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const count = args.count ?? 1;

    // Validate count
    if (count < 1) {
      throw new Error("Count must be at least 1");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Fetch plan details
    const planKey = user.tier === "paid" ? "pro" : user.tier;
    const plan = await ctx.db
      .query("plans")
      .withIndex("by_key", (q) => q.eq("key", planKey))
      .first();

    const imageLimit = plan?.imagesPerPeriod ?? (planKey === "pro" ? 130 : 12);
    const videoLimit = plan?.videosPerPeriod ?? (planKey === "pro" ? 25 : 3);
    const limit = args.type === "image" ? imageLimit : videoLimit;

    // Check if billing period has ended
    const now = Date.now();
    const needsReset = user.billingCycleEnd && now > user.billingCycleEnd;

    let currentUsed: number;

    if (needsReset) {
      // Period has expired, treat as fresh quota
      currentUsed = 0;
    } else {
      currentUsed =
        args.type === "image"
          ? (user.imagesUsedInPeriod ?? 0)
          : (user.videosUsedInPeriod ?? 0);
    }

    // Check if quota is available BEFORE incrementing
    if (currentUsed + count > limit) {
      throw new Error(
        `Quota exceeded: ${currentUsed}/${limit} ${args.type}s used this period. Requested ${count}, but only ${limit - currentUsed} remaining.`
      );
    }

    // Atomically increment quota (this happens in same transaction as the check)
    const newUsed = currentUsed + count;

    if (args.type === "image") {
      await ctx.db.patch(user._id, {
        imagesUsedInPeriod: newUsed,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(user._id, {
        videosUsedInPeriod: newUsed,
        updatedAt: Date.now(),
      });
    }

    return {
      success: true,
      used: newUsed,
      limit,
      remaining: limit - newUsed,
    };
  },
});

/**
 * Refund quota for failed generations
 *
 * @param type - Generation type ("image" or "video")
 * @param count - Number of items to refund (default: 1)
 */
export const refundQuota = mutation({
  args: {
    type: v.union(v.literal("image"), v.literal("video")),
    count: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const count = args.count ?? 1;

    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    if (args.type === "image") {
      const currentUsed = user.imagesUsedInPeriod ?? 0;
      await ctx.db.patch(user._id, {
        imagesUsedInPeriod: Math.max(0, currentUsed - count),
        updatedAt: Date.now(),
      });
    } else {
      const currentUsed = user.videosUsedInPeriod ?? 0;
      await ctx.db.patch(user._id, {
        videosUsedInPeriod: Math.max(0, currentUsed - count),
        updatedAt: Date.now(),
      });
    }

    return { success: true };
  },
});

/**
 * Reset quota counters for a user
 *
 * Internal mutation called when billing period renews
 */
export const resetQuotaForUser = internalMutation({
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

    const now = Date.now();

    // Calculate new billing cycle dates
    const signupDate = new Date(user.billingCycleStart ?? user.createdAt);
    const currentDate = new Date(now);

    const newBillingStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      signupDate.getDate()
    ).getTime();

    const newBillingEnd = new Date(
      new Date(newBillingStart).getFullYear(),
      new Date(newBillingStart).getMonth() + 1,
      signupDate.getDate()
    ).getTime();

    await ctx.db.patch(user._id, {
      imagesUsedInPeriod: 0,
      videosUsedInPeriod: 0,
      billingCycleStart: newBillingStart,
      billingCycleEnd: newBillingEnd,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Scheduled task to reset quotas for users whose billing period has ended
 *
 * Runs daily to check for expired billing periods
 */
export const resetExpiredQuotas = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find all users whose billing period has ended
    const allUsers = await ctx.db.query("users").collect();

    let resetCount = 0;

    for (const user of allUsers) {
      if (user.billingCycleEnd && now > user.billingCycleEnd) {
        // Directly reset quota here since this is already an internal mutation
        const signupDate = new Date(user.billingCycleStart ?? user.createdAt);
        const currentDate = new Date(now);

        const newBillingStart = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          signupDate.getDate()
        ).getTime();

        const newBillingEnd = new Date(
          new Date(newBillingStart).getFullYear(),
          new Date(newBillingStart).getMonth() + 1,
          signupDate.getDate()
        ).getTime();

        await ctx.db.patch(user._id, {
          imagesUsedInPeriod: 0,
          videosUsedInPeriod: 0,
          billingCycleStart: newBillingStart,
          billingCycleEnd: newBillingEnd,
          updatedAt: now,
        });

        resetCount++;
      }
    }

    return { resetCount };
  },
});

/**
 * Create a generation record for tracking
 *
 * @param type - Generation type ("image" or "video")
 * @param metadata - Optional metadata about the generation
 * @returns Generation ID
 */
export const createGeneration = mutation({
  args: {
    type: v.union(v.literal("image"), v.literal("video")),
    metadata: v.optional(
      v.object({
        model: v.optional(v.string()),
        prompt: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const generationId = await ctx.db.insert("generations", {
      userId,
      type: args.type,
      status: "pending",
      countedTowardsQuota: false,
      createdAt: Date.now(),
      metadata: args.metadata,
    });

    return generationId;
  },
});

/**
 * Update generation status
 *
 * @param generationId - Generation ID
 * @param status - New status
 */
export const updateGenerationStatus = mutation({
  args: {
    generationId: v.id("generations"),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.generationId, {
      status: args.status,
    });

    return { success: true };
  },
});

/**
 * Helper function to calculate next billing date from signup date
 */
function calculateNextBillingDate(signupTimestamp: number): number {
  const signupDate = new Date(signupTimestamp);
  const now = new Date();

  const nextBillingDate = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    signupDate.getDate()
  );

  return nextBillingDate.getTime();
}

// Import api for internal mutations
import { api } from "./_generated/api";
