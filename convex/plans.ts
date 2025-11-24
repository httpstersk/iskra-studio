import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Seed the database with default plans
 */
export const seedPlans = internalMutation({
  args: {},
  handler: async (ctx) => {
    const plans = [
      {
        imagesPerPeriod: 12,
        key: "free",
        name: "Free",
        videosPerPeriod: 3,
      },
      {
        imagesPerPeriod: 130,
        key: "pro",
        name: "Pro",
        videosPerPeriod: 25,
      },
    ];

    for (const plan of plans) {
      const existing = await ctx.db
        .query("plans")
        .withIndex("by_key", (q) => q.eq("key", plan.key))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, plan);
      } else {
        await ctx.db.insert("plans", plan);
      }
    }

    return { success: true, count: plans.length };
  },
});

/**
 * Get plan by key
 */
export const getPlan = query({
  args: {
    key: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("plans")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
  },
});

/**
 * Get all plans
 */
export const listPlans = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("plans").collect();
  },
});
