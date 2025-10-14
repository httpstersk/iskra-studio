/**
 * Convex Database Schema
 * 
 * Defines the database tables for Iskra (spark-videos):
 * - users: User accounts with tiers and storage quotas
 * - assets: Images and videos uploaded by users
 * - projects: Canvas workspaces with saved state
 * 
 * @remarks
 * All tables use userId indexing for efficient per-user queries.
 * Storage quotas are tracked in bytes and enforced before uploads.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Database schema definition
 */
export default defineSchema({
  /**
   * Users table
   * 
   * Stores user account information, tier status, and storage usage.
   * One record per authenticated user (linked to Clerk userId).
   * 
   * @property userId - Clerk user ID (unique, indexed)
   * @property email - User's email address
   * @property tier - Subscription tier ("free" | "paid")
   * @property storageUsedBytes - Total storage used by user's assets (in bytes)
   * @property createdAt - Account creation timestamp
   * @property updatedAt - Last account update timestamp
   */
  users: defineTable({
    createdAt: v.number(),
    email: v.string(),
    storageUsedBytes: v.number(),
    tier: v.union(v.literal("free"), v.literal("paid")),
    updatedAt: v.number(),
    userId: v.string(),
  })
    .index("by_userId", ["userId"]),

  /**
   * Assets table
   * 
   * Stores metadata for all uploaded images and videos.
   * Actual files are stored in Convex file storage.
   * 
   * @property userId - Owner's Clerk user ID (indexed)
   * @property type - Asset type ("image" | "video")
   * @property storageId - Convex file storage ID
   * @property originalUrl - Original FAL URL (nullable, for reference)
   * @property width - Asset width in pixels
   * @property height - Asset height in pixels
   * @property duration - Video duration in seconds (nullable, video only)
   * @property mimeType - MIME type (e.g., "image/png", "video/mp4")
   * @property sizeBytes - File size in bytes
   * @property metadata - Additional metadata (generation params, prompts, etc.)
   * @property createdAt - Upload timestamp
   */
  assets: defineTable({
    createdAt: v.number(),
    duration: v.optional(v.number()),
    height: v.optional(v.number()),
    metadata: v.object({
      model: v.optional(v.string()),
      prompt: v.optional(v.string()),
      seed: v.optional(v.number()),
    }),
    mimeType: v.string(),
    originalUrl: v.optional(v.string()),
    sizeBytes: v.number(),
    storageId: v.string(),
    type: v.union(v.literal("image"), v.literal("video")),
    userId: v.string(),
    width: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_type", ["userId", "type"])
    .index("by_storageId", ["storageId"]),

  /**
   * Projects table
   * 
   * Stores canvas workspace state for each user's project.
   * Canvas state includes all placed images, videos, viewport position, etc.
   * 
   * @property userId - Owner's Clerk user ID (indexed)
   * @property name - Project display name
   * @property canvasState - Complete canvas state object (images, videos, viewport, selections)
   * @property thumbnailStorageId - Convex storage ID for project thumbnail (nullable)
   * @property lastSavedAt - Last auto-save timestamp
   * @property createdAt - Project creation timestamp
   * @property updatedAt - Last project update timestamp
   */
  projects: defineTable({
    canvasState: v.object({
      backgroundColor: v.optional(v.string()),
      elements: v.array(
        v.object({
          currentTime: v.optional(v.number()),
          duration: v.optional(v.number()),
          height: v.optional(v.number()),
          id: v.string(),
          imageId: v.optional(v.string()),
          isPlaying: v.optional(v.boolean()),
          muted: v.optional(v.boolean()),
          transform: v.object({
            rotation: v.number(),
            scale: v.number(),
            x: v.number(),
            y: v.number(),
          }),
          type: v.union(
            v.literal("image"),
            v.literal("video"),
            v.literal("text"),
            v.literal("shape")
          ),
          videoId: v.optional(v.string()),
          volume: v.optional(v.number()),
          width: v.optional(v.number()),
          zIndex: v.number(),
        })
      ),
      lastModified: v.number(),
      viewport: v.optional(
        v.object({
          scale: v.number(),
          x: v.number(),
          y: v.number(),
        })
      ),
    }),
    createdAt: v.number(),
    lastSavedAt: v.number(),
    name: v.string(),
    thumbnailStorageId: v.optional(v.string()),
    updatedAt: v.number(),
    userId: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_lastSavedAt", ["userId", "lastSavedAt"]),
});
