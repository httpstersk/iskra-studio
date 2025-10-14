/**
 * Convex user management functions.
 * 
 * Handles user creation, quota tracking, and user data retrieval.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Gets or creates a user record in Convex.
 * 
 * Automatically creates a new user with default "free" tier on first sign-in.
 * Returns existing user data on subsequent calls.
 * 
 * @param userId - Clerk user ID
 * @param email - User's email address
 * @returns User record with tier and storage information
 */
export const getOrCreateUser = mutation({
  args: {
    email: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (existingUser) {
      return existingUser;
    }

    // Create new user with default free tier
    const userId = await ctx.db.insert("users", {
      createdAt: Date.now(),
      email: args.email,
      storageUsedBytes: 0,
      tier: "free",
      updatedAt: Date.now(),
      userId: args.userId,
    });

    return await ctx.db.get(userId);
  },
});

/**
 * Gets user quota information.
 * 
 * @param userId - Clerk user ID
 * @returns User's storage quota data
 */
export const getUserQuota = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    return {
      storageUsedBytes: user.storageUsedBytes,
      tier: user.tier,
    };
  },
});

/**
 * Updates user's storage quota by recalculating from all assets.
 * 
 * @param userId - Clerk user ID
 * @returns Updated storage usage in bytes
 */
export const updateUserQuota = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get user record
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Calculate total storage from all assets
    const assets = await ctx.db
      .query("assets")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    const totalBytes = assets.reduce((sum, asset) => sum + asset.sizeBytes, 0);

    // Update user record
    await ctx.db.patch(user._id, {
      storageUsedBytes: totalBytes,
      updatedAt: Date.now(),
    });

    return totalBytes;
  },
});
