/**
 * Upload Rate Limiting
 *
 * Implements user-based rate limiting for file uploads to prevent abuse.
 * Tracks upload requests and enforces limits per minute and per hour.
 */

import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Check if user has exceeded upload rate limits
 *
 * Enforces:
 * - 20 uploads per minute
 * - 100 uploads per hour
 *
 * @param userId - User ID to check
 * @returns Object indicating if rate limit is exceeded and details
 */
export const checkUploadRateLimit = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    // Get all upload requests from this user in the last hour
    const recentUploads = await ctx.db
      .query("uploadRateLimits")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.gt(q.field("timestamp"), oneHourAgo))
      .collect();

    // Count uploads in the last minute
    const uploadsLastMinute = recentUploads.filter(
      (upload) => upload.timestamp > oneMinuteAgo,
    ).length;

    // Count uploads in the last hour
    const uploadsLastHour = recentUploads.length;

    // Check limits
    const PER_MINUTE_LIMIT = 20;
    const PER_HOUR_LIMIT = 100;

    if (uploadsLastMinute >= PER_MINUTE_LIMIT) {
      return {
        allowed: false,
        reason: "per_minute",
        limit: PER_MINUTE_LIMIT,
        current: uploadsLastMinute,
      };
    }

    if (uploadsLastHour >= PER_HOUR_LIMIT) {
      return {
        allowed: false,
        reason: "per_hour",
        limit: PER_HOUR_LIMIT,
        current: uploadsLastHour,
      };
    }

    return {
      allowed: true,
      uploadsLastMinute,
      uploadsLastHour,
    };
  },
});

/**
 * Record an upload request for rate limiting
 *
 * @param userId - User ID making the upload
 */
export const recordUploadRequest = internalMutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("uploadRateLimits", {
      userId: args.userId,
      timestamp: Date.now(),
    });
  },
});

/**
 * Clean up old upload rate limit records (older than 1 hour)
 *
 * Should be called by a scheduled cron job to prevent table growth
 */
export const cleanupOldUploadRecords = internalMutation({
  args: {},
  handler: async (ctx) => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    const oldRecords = await ctx.db
      .query("uploadRateLimits")
      .withIndex("by_timestamp")
      .filter((q) => q.lt(q.field("timestamp"), oneHourAgo))
      .collect();

    for (const record of oldRecords) {
      await ctx.db.delete(record._id);
    }

    return { deletedCount: oldRecords.length };
  },
});
