/**
 * Convex asset management functions.
 * 
 * Handles CRUD operations for assets (images and videos) stored in Convex,
 * including storage quota tracking and user authorization.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Creates an asset record after file upload to storage.
 * 
 * @param storageId - Convex storage ID of the uploaded file
 * @param type - Type of asset (image or video)
 * @param sizeBytes - Size of the file in bytes
 * @param mimeType - MIME type of the file
 * @param metadata - Optional metadata (dimensions, generation params, etc.)
 * @returns Asset ID
 */
export const uploadAsset = mutation({
  args: {
    duration: v.optional(v.number()),
    height: v.optional(v.number()),
    metadata: v.optional(v.any()),
    mimeType: v.string(),
    originalUrl: v.optional(v.string()),
    sizeBytes: v.number(),
    storageId: v.string(),
    type: v.union(v.literal("image"), v.literal("video")),
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

    if (!args.mimeType.startsWith("image/") && !args.mimeType.startsWith("video/")) {
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

    // Create asset record
    const assetId = await ctx.db.insert("assets", {
      createdAt: Date.now(),
      duration: args.duration,
      height: args.height,
      metadata: args.metadata,
      mimeType: args.mimeType,
      originalUrl: args.originalUrl,
      sizeBytes: args.sizeBytes,
      storageId: args.storageId,
      type: args.type,
      userId,
      width: args.width,
    });

    // Update user's storage quota
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        storageUsedBytes: user.storageUsedBytes + args.sizeBytes,
        updatedAt: Date.now(),
      });
    }

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

    // Get asset
    const asset = await ctx.db.get(args.assetId);
    if (!asset) {
      throw new Error("Asset not found");
    }

    // Verify ownership
    if (asset.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Delete file from storage
    await ctx.storage.delete(asset.storageId);

    // Delete asset record
    await ctx.db.delete(args.assetId);

    // Update user's storage quota
    const user = await ctx.db
      .query("users")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        storageUsedBytes: Math.max(0, user.storageUsedBytes - asset.sizeBytes),
        updatedAt: Date.now(),
      });
    }
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

    const asset = await ctx.db.get(args.assetId);
    if (!asset) {
      throw new Error("Asset not found");
    }

    // Verify ownership
    if (asset.userId !== userId) {
      throw new Error("Unauthorized");
    }

    return asset;
  },
});

/**
 * Lists all assets for the authenticated user with pagination.
 * 
 * @param limit - Maximum number of assets to return (default: 100)
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
    const limit = args.limit ?? 100;

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
