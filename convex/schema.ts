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
   * Plans table
   *
   * Stores subscription plan configurations and quota limits.
   * Replaces hardcoded constants in the codebase.
   *
   * @property key - Plan identifier ("free", "pro")
   * @property name - Display name
   * @property imagesPerPeriod - Number of images allowed per billing period
   * @property videosPerPeriod - Number of videos allowed per billing period
   */
  plans: defineTable({
    imagesPerPeriod: v.number(),
    key: v.string(),
    name: v.string(),
    videosPerPeriod: v.number(),
  }).index("by_key", ["key"]),

  /**
   * Users table
   *
   * Stores user account information, tier status, and storage usage.
   * One record per authenticated user (linked to Clerk userId).
   *
   * @property userId - Clerk user ID (unique, indexed)
   * @property email - User's email address
   * @property tier - Subscription tier ("free" | "paid" for legacy, "pro" for Polar subscriptions)
   * @property storageUsedBytes - Total storage used by user's assets (in bytes)
   * @property polarCustomerId - Polar customer ID (optional, for subscription management)
   * @property polarSubscriptionId - Polar subscription ID (optional, for active subscriptions)
   * @property subscriptionStatus - Current subscription status (optional)
   * @property billingCycleStart - Billing cycle start timestamp (optional)
   * @property billingCycleEnd - Billing cycle end timestamp (optional)
   * @property imagesUsedInPeriod - Number of images generated in current billing period
   * @property videosUsedInPeriod - Number of videos generated in current billing period
   * @property createdAt - Account creation timestamp
   * @property updatedAt - Last account update timestamp
   */
  users: defineTable({
    billingCycleEnd: v.optional(v.number()),
    billingCycleStart: v.optional(v.number()),
    createdAt: v.number(),
    email: v.string(),
    imagesUsedInPeriod: v.optional(v.number()),
    polarCustomerId: v.optional(v.string()),
    polarSubscriptionId: v.optional(v.string()),
    storageUsedBytes: v.number(),
    subscriptionStatus: v.optional(
      v.union(
        v.literal("active"),
        v.literal("cancelled"),
        v.literal("past_due"),
        v.literal("incomplete"),
        v.literal("trialing")
      )
    ),
    tier: v.union(v.literal("free"), v.literal("paid"), v.literal("pro")),
    updatedAt: v.number(),
    userId: v.string(),
    videosUsedInPeriod: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_polarCustomerId", ["polarCustomerId"])
    .index("by_polarSubscriptionId", ["polarSubscriptionId"]),

  /**
   * Assets table
   *
   * Stores metadata for all uploaded images and videos.
   * Actual files are stored in Convex file storage.
   *
   * @property userId - Owner's Clerk user ID (indexed)
   * @property type - Asset type ("image" | "video")
   * @property storageId - Convex file storage ID (full-size, for FAL API)
   * @property thumbnailStorageId - Convex file storage ID for thumbnail (nullable, for UI)
   * @property originalUrl - Original FAL URL (nullable, for reference)
   * @property width - Asset width in pixels
   * @property height - Asset height in pixels
   * @property duration - Video duration in seconds (nullable, video only)
   * @property directorName - Director name for AI-generated director-style variations (nullable)
   * @property cameraAngle - Camera angle directive for AI-generated camera angle variations (nullable)
   * @property lightingScenario - Lighting scenario for AI-generated lighting variations (nullable)
   * @property emotion - Emotion label for AI-generated emotion variations (nullable)
   * @property storylineLabel - Time progression label for storyline variations (nullable, e.g., "+1min", "+2h5m")
   * @property characterVariation - Character description for character variations (nullable)
   * @property variationType - Variation type for grouping/filtering (nullable, e.g., "director", "camera", "emotion")
   * @property mimeType - MIME type (e.g., "image/png", "video/mp4")
   * @property sizeBytes - File size in bytes
   * @property createdAt - Upload timestamp
   */
  assets: defineTable({
    cameraAngle: v.optional(v.string()),
    characterVariation: v.optional(v.string()),
    createdAt: v.number(),
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
    thumbnailStorageId: v.optional(v.string()),
    type: v.union(v.literal("image"), v.literal("video")),
    userId: v.string(),
    variationType: v.optional(v.string()),
    width: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_type", ["userId", "type"])
    .index("by_storageId", ["storageId"]),

  /**
   * Projects table
   *
   * Stores canvas workspace metadata.
   * Canvas state is moved to project_states table for performance.
   *
   * @property userId - Owner's Clerk user ID (indexed)
   * @property name - Project display name
   * @property thumbnailStorageId - Convex storage ID for project thumbnail (nullable)
   * @property lastSavedAt - Last auto-save timestamp
   * @property createdAt - Project creation timestamp
   * @property updatedAt - Last project update timestamp
   */
  projects: defineTable({
    createdAt: v.number(),
    imageCount: v.optional(v.number()),
    lastSavedAt: v.number(),
    name: v.string(),
    thumbnailStorageId: v.optional(v.string()),
    updatedAt: v.number(),
    userId: v.string(),
    videoCount: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_lastSavedAt", ["userId", "lastSavedAt"]),

  /**
   * Project States table
   *
   * Stores the heavy canvas state for projects.
   * Separated from projects table to improve list performance.
   *
   * @property projectId - Link to projects table (indexed)
   * @property canvasState - Complete canvas state object
   */
  projectStates: defineTable({
    canvasState: v.object({
      backgroundColor: v.optional(v.string()),
      elements: v.array(
        v.object({
          assetId: v.optional(v.string()),
          assetSyncedAt: v.optional(v.number()),
          assetType: v.optional(
            v.union(v.literal("image"), v.literal("video"))
          ),
          currentTime: v.optional(v.number()),
          duration: v.optional(v.number()),
          height: v.optional(v.number()),
          id: v.string(),
          isPlaying: v.optional(v.boolean()),
          muted: v.optional(v.boolean()),
          originalFalUrl: v.optional(v.string()),
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
    projectId: v.id("projects"),
  }).index("by_projectId", ["projectId"]),

  /**
   * Generations table
   *
   * Tracks all image and video generation attempts for quota management.
   * Used to determine if a generation should count towards user's quota.
   *
   * @property userId - Owner's Clerk user ID (indexed)
   * @property type - Generation type ("image" | "video")
   * @property status - Generation status ("pending" | "completed" | "failed")
   * @property countedTowardsQuota - Whether this generation was counted towards user's quota
   * @property createdAt - Generation request timestamp
   * @property metadata - Optional metadata about the generation (prompt, model, etc.)
   */
  generations: defineTable({
    countedTowardsQuota: v.boolean(),
    createdAt: v.number(),
    metadata: v.optional(
      v.object({
        model: v.optional(v.string()),
        prompt: v.optional(v.string()),
      })
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed")
    ),
    type: v.union(v.literal("image"), v.literal("video")),
    userId: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_type", ["userId", "type"])
    .index("by_userId_and_status", ["userId", "status"]),

  /**
   * Webhook Events table
   *
   * Tracks processed webhook events to prevent replay attacks.
   * Events older than 30 days are automatically cleaned up.
   *
   * @property eventId - Unique event ID from webhook provider (indexed)
   * @property eventType - Type of webhook event (e.g., "subscription.created")
   * @property processedAt - Timestamp when event was processed
   * @property source - Webhook source ("polar")
   */
  webhookEvents: defineTable({
    eventId: v.string(),
    eventType: v.string(),
    processedAt: v.number(),
    source: v.string(),
  })
    .index("by_eventId", ["eventId"])
    .index("by_processedAt", ["processedAt"]),

  /**
   * Upload Rate Limits table
   *
   * Tracks upload requests per user for rate limiting.
   * Records older than 1 hour are automatically cleaned up.
   *
   * @property userId - User ID making the upload request
   * @property timestamp - When the upload request was made
   */
  uploadRateLimits: defineTable({
    userId: v.string(),
    timestamp: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_timestamp", ["timestamp"]),
});
