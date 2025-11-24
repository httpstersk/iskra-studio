import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const migrateProjectStates = internalMutation({
    args: {
        cursor: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit ?? 100;
        const cursor = args.cursor ?? null;

        const projects = await ctx.db
            .query("projects")
            .paginate({ cursor, numItems: limit });

        let count = 0;

        for (const project of projects.page) {
            // 1. Migrate canvasState to projectStates
            const existingState = await ctx.db
                .query("projectStates")
                .withIndex("by_projectId", (q) => q.eq("projectId", project._id))
                .first();

            if (!existingState && (project as any).canvasState) {
                await ctx.db.insert("projectStates", {
                    projectId: project._id,
                    canvasState: (project as any).canvasState,
                });
                count++;
            }

            // 2. Backfill counts if missing
            if (
                project.imageCount === undefined ||
                project.videoCount === undefined
            ) {
                const canvasState =
                    (project as any).canvasState || existingState?.canvasState;

                if (canvasState) {
                    const imageCount = canvasState.elements.filter(
                        (e: any) => e.type === "image"
                    ).length;
                    const videoCount = canvasState.elements.filter(
                        (e: any) => e.type === "video"
                    ).length;

                    await ctx.db.patch(project._id, {
                        imageCount,
                        videoCount,
                    });
                } else {
                    // No state found, assume 0
                    await ctx.db.patch(project._id, {
                        imageCount: 0,
                        videoCount: 0,
                    });
                }
            }
        }

        return {
            count,
            isDone: projects.isDone,
            continueCursor: projects.continueCursor,
        };
    },
});
