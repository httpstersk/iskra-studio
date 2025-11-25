/**
 * Convex asset management functions.
 *
 * Handles CRUD operations for assets (images and videos) stored in Convex,
 * including storage quota tracking and user authorization.
 */

import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

/**
 * Creates an asset record after file upload to storage.
 *
 * @param cameraAngle - Optional camera angle directive for AI-generated camera angle variations
 * @param characterVariation - Optional character description for character variations
 * @param directorName - Optional director name for AI-generated director-style variations
 * @param emotion - Optional emotion label for AI-generated emotion variations
 * @param lightingScenario - Optional lighting scenario for AI-generated lighting variations
 * @param metadata - Optional metadata (dimensions, generation params, etc.)
 * @param mimeType - MIME type of the file
 * @param sizeBytes - Size of the file in bytes
 * @param storageId - Convex storage ID of the uploaded file (full-size)
 * @param storylineLabel - Optional time progression label for storyline variations
 * @param thumbnailStorageId - Optional Convex storage ID for thumbnail
 * @param type - Type of asset (image or video)
 * @param variationType - Optional variation type for grouping/filtering
 * @returns Asset ID
 */
export const uploadAsset = mutation({
  args: {
    cameraAngle: v.optional(v.string()),
    characterVariation: v.optional(v.string()),
    directorName: v.optional(v.string()),
    duration: v.optional(v.number()),
    emotion: v.optional(v.string()),
    height: v.optional(v.number()),
    lightingScenario: v.optional(v.string()),
    mimeType: v.string(),
    originalUrl: v.optional(v.string()),
    sizeBytes: v.number(),
    storageId: v.string(),
    storylineLabel: v.optional(v.string()),
    surfaceMap: v.optional(v.string()),
    thumbnailStorageId: v.optional(v.string()),
    type: v.union(v.literal("image"), v.literal("video")),
    variationType: v.optional(v.string()),
    width: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Derive userId from authenticated identity
    const userId = identity.subject;

    // Validate inputs
    if (args.sizeBytes <= 0 || args.sizeBytes > 25 * 1024 * 1024) {
      throw new Error("Invalid file size");
    }

    if (
      !args.mimeType.startsWith("image/") &&
      !args.mimeType.startsWith("video/")
    ) {
      throw new Error("Invalid MIME type");
    }

    if (args.width && (args.width <= 0 || args.width > 10000)) {
      throw new Error("Invalid width");
    }

    if (args.height && (args.height <= 0 || args.height > 10000)) {
      throw new Error("Invalid height");
    }

    if (args.duration && (args.duration <= 0 || args.duration > 7200)) {
      throw new Error("Invalid duration");
    }

    if (args.directorName && args.directorName.length > 100) {
      throw new Error("Director name too long (max 100 characters)");
    }

    if (args.lightingScenario && args.lightingScenario.length > 500) {
      throw new Error("Lighting scenario too long (max 500 characters)");
    }

    if (args.emotion && args.emotion.length > 100) {
      throw new Error("Emotion label too long (max 100 characters)");
    }

    if (args.storylineLabel && args.storylineLabel.length > 50) {
      throw new Error("Storyline label too long (max 50 characters)");
    }

    if (args.characterVariation && args.characterVariation.length > 500) {
      throw new Error("Character variation too long (max 500 characters)");
    }

    if (args.variationType && args.variationType.length > 50) {
      throw new Error("Variation type too long (max 50 characters)");
    }

    // Create asset record
    const assetId = await ctx.db.insert("assets", {
      cameraAngle: args.cameraAngle,
      characterVariation: args.characterVariation,
      createdAt: Date.now(),
      directorName: args.directorName,
      duration: args.duration,
      emotion: args.emotion,
      height: args.height,
      lightingScenario: args.lightingScenario,
      mimeType: args.mimeType,
      originalUrl: args.originalUrl,
      sizeBytes: args.sizeBytes,
      storageId: args.storageId,
      storylineLabel: args.storylineLabel,
      surfaceMap: args.surfaceMap,
      thumbnailStorageId: args.thumbnailStorageId,
      type: args.type,
      userId,
      variationType: args.variationType,
      width: args.width,
    });

    // Update user's storage quota
    // Note: Convex mutations use optimistic concurrency control (OCC) with automatic
    // retries. If multiple uploads happen concurrently and cause a conflict, Convex
    // will automatically retry this mutation with the latest user data, ensuring
    // accurate quota tracking without race conditions.
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!user) {
      // User should exist since we're authenticated, but handle gracefully
      throw new Error("User record not found");
    }

    await ctx.db.patch(user._id, {
      storageUsedBytes: user.storageUsedBytes + args.sizeBytes,
      updatedAt: Date.now(),
    });

    return assetId;
  },
});

/**
 * Deletes an asset from database and storage, updates user quota.
 *
 * @param assetId - ID of the asset to delete
 */
export const deleteAsset = mutation({
  args: {
    assetId: v.id("assets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Use index-based query to prevent IDOR timing attacks
    // Only fetch assets owned by the authenticated user
    const asset = await ctx.db
      .query("assets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.assetId))
      .first();

    if (!asset) {
      // Unified error prevents user enumeration
      throw new Error("Asset not found or access denied");
    }

    // Delete file from storage
    await ctx.storage.delete(asset.storageId);

    // Delete asset record
    await ctx.db.delete(args.assetId);

    // Update user's storage quota
    // Note: Convex mutations use optimistic concurrency control (OCC) with automatic
    // retries. If multiple deletes happen concurrently and cause a conflict, Convex
    // will automatically retry this mutation with the latest user data, ensuring
    // accurate quota tracking without race conditions.
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!user) {
      // User should exist since we're authenticated, but handle gracefully
      throw new Error("User record not found");
    }

    await ctx.db.patch(user._id, {
      storageUsedBytes: Math.max(0, user.storageUsedBytes - asset.sizeBytes),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Gets a single asset by ID with ownership verification.
 *
 * @param assetId - ID of the asset to retrieve
 * @returns Asset record
 */
export const getAsset = query({
  args: {
    assetId: v.id("assets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Use index-based query to prevent IDOR timing attacks
    // Only fetch assets owned by the authenticated user
    const asset = await ctx.db
      .query("assets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.assetId))
      .first();

    if (!asset) {
      // Unified error prevents user enumeration
      throw new Error("Asset not found or access denied");
    }

    return asset;
  },
});

/**
 * Lists all assets for the authenticated user with pagination.
 *
 * @param limit - Maximum number of assets to return (default: 20, max: 100)
 * @param type - Optional filter by asset type
 * @returns Array of asset records
 */
export const listAssets = query({
  args: {
    limit: v.optional(v.number()),
    type: v.optional(v.union(v.literal("image"), v.literal("video"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    // Cap limit to prevent DoS attacks
    const MAX_LIMIT = 100;
    const DEFAULT_LIMIT = 20;
    const limit = Math.min(args.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    // Query with optional type filter
    let query;

    if (args.type) {
      const assetType = args.type; // TypeScript narrowing
      query = ctx.db
        .query("assets")
        .withIndex("by_userId_and_type", (q) =>
          q.eq("userId", userId).eq("type", assetType),
        );
    } else {
      query = ctx.db
        .query("assets")
        .withIndex("by_userId", (q) => q.eq("userId", userId));
    }

    const assets = await query.order("desc").take(limit);

    return assets;
  },
});

/**
 * Internal mutation to atomically increment storage quota
 *
 * This prevents race conditions when multiple uploads happen concurrently.
 * Uses optimistic concurrency control with retry logic.
 *
 * @param userId - User ID
 * @param sizeBytes - Number of bytes to add to storage quota
 */
export const incrementStorageQuota = internalMutation({
  args: {
    userId: v.string(),
    sizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!user) {
      throw new Error(`User not found: ${args.userId}`);
    }

    // Atomic update - Convex handles concurrency with automatic retries
    await ctx.db.patch(user._id, {
      storageUsedBytes: user.storageUsedBytes + args.sizeBytes,
      updatedAt: Date.now(),
    });

    return { success: true, newTotal: user.storageUsedBytes + args.sizeBytes };
  },
});

/**
 * Internal mutation to atomically decrement storage quota
 *
 * This prevents race conditions when multiple deletes happen concurrently.
 * Uses optimistic concurrency control with retry logic.
 *
 * @param userId - User ID
 * @param sizeBytes - Number of bytes to subtract from storage quota
 */
export const decrementStorageQuota = internalMutation({
  args: {
    userId: v.string(),
    sizeBytes: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!user) {
      throw new Error(`User not found: ${args.userId}`);
    }

    // Atomic update - Convex handles concurrency with automatic retries
    // Ensure storage doesn't go negative
    const newTotal = Math.max(0, user.storageUsedBytes - args.sizeBytes);

    await ctx.db.patch(user._id, {
      storageUsedBytes: newTotal,
      updatedAt: Date.now(),
    });

    return { success: true, newTotal };
  },
});
