/**
 * Convex quota management functions.
 *
 * Handles quota tracking, enforcement, and reset logic for image and video generations.
 */

import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Quota limits for each subscription tier
 */
export const QUOTA_LIMITS = {
  free: {
    images: 24,
    videos: 4,
  },
  pro: {
    images: 480,
    videos: 96,
  },
  paid: {
    // Legacy tier - same as pro
    images: 480,
    videos: 96,
  },
} as const;

/**
 * Check if user has available quota for a generation
 *
 * @param type - Generation type ("image" or "video")
 * @returns Object with hasQuota, used, limit, and remaining
 */
export const checkQuota = query({
  args: {
    type: v.union(v.literal("image"), v.literal("video")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if billing period has ended and reset if needed
    const now = Date.now();
    if (user.billingCycleEnd && now > user.billingCycleEnd) {
      // Billing period ended, quota should be reset
      // This will be handled by the scheduled job, but we can do it here too
      await ctx.runMutation(api.quotas.resetQuotaForUser, {
        userId,
      });

      // Return fresh quota after reset
      return {
        hasQuota: true,
        used: 0,
        limit: getQuotaLimit(user.tier, args.type),
        remaining: getQuotaLimit(user.tier, args.type),
      };
    }

    const used =
      args.type === "image"
        ? user.imagesUsedInPeriod ?? 0
        : user.videosUsedInPeriod ?? 0;

    const limit = getQuotaLimit(user.tier, args.type);
    const remaining = Math.max(0, limit - used);
    const hasQuota = remaining > 0;

    return {
      hasQuota,
      used,
      limit,
      remaining,
    };
  },
});

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

    const now = Date.now();
    const imagesUsed = user.imagesUsedInPeriod ?? 0;
    const videosUsed = user.videosUsedInPeriod ?? 0;

    const imageLimit = getQuotaLimit(user.tier, "image");
    const videoLimit = getQuotaLimit(user.tier, "video");

    return {
      tier: user.tier,
      images: {
        used: imagesUsed,
        limit: imageLimit,
        remaining: Math.max(0, imageLimit - imagesUsed),
        percentage: Math.min(100, Math.round((imagesUsed / imageLimit) * 100)),
      },
      videos: {
        used: videosUsed,
        limit: videoLimit,
        remaining: Math.max(0, videoLimit - videosUsed),
        percentage: Math.min(100, Math.round((videosUsed / videoLimit) * 100)),
      },
      billingCycleStart: user.billingCycleStart ?? user.createdAt,
      billingCycleEnd: user.billingCycleEnd ?? calculateNextBillingDate(user.createdAt),
      daysUntilReset: user.billingCycleEnd
        ? Math.ceil((user.billingCycleEnd - now) / (1000 * 60 * 60 * 24))
        : 30,
    };
  },
});

/**
 * Increment quota usage after successful generation
 *
 * @param type - Generation type ("image" or "video")
 * @param generationId - ID of the generation record (optional, for tracking)
 */
export const incrementQuota = mutation({
  args: {
    type: v.union(v.literal("image"), v.literal("video")),
    generationId: v.optional(v.id("generations")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Increment the appropriate counter
    if (args.type === "image") {
      await ctx.db.patch(user._id, {
        imagesUsedInPeriod: (user.imagesUsedInPeriod ?? 0) + 1,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(user._id, {
        videosUsedInPeriod: (user.videosUsedInPeriod ?? 0) + 1,
        updatedAt: Date.now(),
      });
    }

    // Update generation record if provided
    if (args.generationId) {
      await ctx.db.patch(args.generationId, {
        countedTowardsQuota: true,
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
        await ctx.runMutation(api.quotas.resetQuotaForUser, {
          userId: user.userId,
        });
        resetCount++;
      }
    }

    console.log(`Reset quotas for ${resetCount} users`);
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
 * Helper function to get quota limit for a tier and type
 */
function getQuotaLimit(
  tier: "free" | "pro" | "paid",
  type: "image" | "video"
): number {
  const tierLimits = QUOTA_LIMITS[tier];
  return type === "image" ? tierLimits.images : tierLimits.videos;
}

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
