/**
 * Webhook Event Tracking
 *
 * Provides idempotency and replay attack protection for webhook events.
 * Tracks processed events and automatically cleans up old records.
 */

import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Check if a webhook event has already been processed
 *
 * @param eventId - Unique event ID from webhook provider
 * @returns boolean - true if event was already processed, false otherwise
 *
 * @remarks
 * This query is used to prevent replay attacks by checking if we've
 * already processed this event before. Should be called before processing
 * any webhook event.
 */
export const isEventProcessed = query({
  args: {
    eventId: v.string(),
  },
  handler: async (ctx, args) => {
    const existingEvent = await ctx.db
      .query("webhookEvents")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .first();

    return existingEvent !== null;
  },
});

/**
 * Mark a webhook event as processed
 *
 * @param eventId - Unique event ID from webhook provider
 * @param eventType - Type of webhook event (e.g., "subscription.created")
 * @param source - Webhook source (e.g., "polar")
 *
 * @remarks
 * Should be called after successfully processing a webhook event to prevent
 * duplicate processing. Events are automatically cleaned up after 30 days.
 */
export const markEventProcessed = mutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    source: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("webhookEvents", {
      eventId: args.eventId,
      eventType: args.eventType,
      source: args.source,
      processedAt: Date.now(),
    });
  },
});

/**
 * Clean up old webhook events (older than 30 days)
 *
 * @remarks
 * This should be called by a scheduled cron job to prevent the webhookEvents
 * table from growing indefinitely. Removes events older than 30 days.
 */
export const cleanupOldEvents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    // Query for old events
    const oldEvents = await ctx.db
      .query("webhookEvents")
      .withIndex("by_processedAt")
      .filter((q) => q.lt(q.field("processedAt"), thirtyDaysAgo))
      .collect();

    // Delete old events
    for (const event of oldEvents) {
      await ctx.db.delete(event._id);
    }

    return { deletedCount: oldEvents.length };
  },
});
