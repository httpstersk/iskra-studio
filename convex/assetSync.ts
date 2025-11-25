/**
 * Asset synchronization and validation mutations.
 *
 * Handles validation of element-to-asset references and maintains
 * consistency between saved projects and the assets table.
 */

import { v } from "convex/values";
import { query } from "./_generated/server";

/**
 * Validates element asset references for a project.
 *
 * Checks that all elements with assetId references have valid,
 * accessible assets in the database. Returns detailed validation
 * results for invalid or orphaned references.
 *
 * @param projectId - ID of the project to validate
 * @returns Validation results with statistics and error details
 */
export const validateProjectAssets = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Get project
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Verify ownership
    if (project.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Fetch project state
    const projectState = await ctx.db
      .query("projectStates")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .first();

    // Fallback to legacy canvasState if not found in new table (during migration)
    const canvasState =
      projectState?.canvasState ?? (project as any).canvasState;

    if (!canvasState) {
      throw new Error("Project state not found");
    }

    // Load all user's assets for reference checking
    const userAssets = await ctx.db
      .query("assets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const assetMap = new Map(userAssets.map((a) => [a._id, a]));

    // Validate each element
    const validElements: string[] = [];
    const invalidElements: Array<{
      elementId: string;
      reason: string;
    }> = [];
    const staleMetadata: Array<{
      elementId: string;
      assetId: string;
    }> = [];

    for (const element of canvasState.elements) {
      if (!element.assetId) {
        // Elements without asset references are valid (text, shapes, etc.)
        if (element.type !== "image" && element.type !== "video") {
          validElements.push(element.id);
        }
        continue;
      }

      // Check if asset exists
      const asset = assetMap.get(element.assetId as any);
      if (!asset) {
        invalidElements.push({
          elementId: element.id,
          reason: `Asset ${element.assetId} not found`,
        });
        continue;
      }

      // Verify asset type matches
      if (element.assetType && asset.type !== element.assetType) {
        invalidElements.push({
          elementId: element.id,
          reason: `Asset type mismatch: element has ${element.assetType}, asset is ${asset.type}`,
        });
        continue;
      }

      // Check if metadata differs
      const metadataDiffers =
        (element.width && asset.width && element.width !== asset.width) ||
        (element.height && asset.height && element.height !== asset.height) ||
        (element.duration &&
          asset.duration &&
          element.duration !== asset.duration);

      if (metadataDiffers) {
        staleMetadata.push({
          elementId: element.id,
          assetId: element.assetId,
        });
      }

      validElements.push(element.id);
    }

    return {
      projectId: args.projectId,
      isValid: invalidElements.length === 0 && staleMetadata.length === 0,
      totalElements: canvasState.elements.length,
      validElements: validElements.length,
      invalidElements,
      staleMetadata,
    };
  },
});

/**
 * Lists all assets that are referenced by a specific project.
 *
 * Useful for understanding asset dependencies and cleanup.
 * Returns asset records for all elements with assetId references.
 *
 * @param projectId - ID of the project
 * @returns Array of asset records used in the project
 */
export const getProjectAssets = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Get project
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Verify ownership
    if (project.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Fetch project state
    const projectState = await ctx.db
      .query("projectStates")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .first();

    // Fallback to legacy canvasState if not found in new table (during migration)
    const canvasState =
      projectState?.canvasState ?? (project as any).canvasState;

    if (!canvasState) {
      throw new Error("Project state not found");
    }

    // Collect unique asset IDs from elements
    const assetIds = new Set<string>();
    for (const element of canvasState.elements) {
      if (element.assetId) {
        assetIds.add(element.assetId);
      }
    }

    if (assetIds.size === 0) {
      return [];
    }

    // Fetch asset records
    const assets = await Promise.all(
      Array.from(assetIds).map((assetId) =>
        ctx.db
          .query("assets")
          .filter((q) => q.eq(q.field("_id"), assetId as any))
          .unique(),
      ),
    );

    return assets.filter((a) => a !== null);
  },
});

/**
 * Gets projects that use a specific asset.
 *
 * Useful for understanding asset usage before deletion.
 * Returns all projects where elements reference the given asset.
 *
 * @param assetId - ID of the asset
 * @returns Array of projects using this asset
 */
export const getProjectsUsingAsset = query({
  args: {
    assetId: v.id("assets"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Get the asset to verify ownership
    const asset = await ctx.db.get(args.assetId);
    if (!asset) {
      throw new Error("Asset not found");
    }

    // Verify ownership
    if (asset.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Find all user's projects
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Filter to projects using this asset
    // This is less efficient now as we have to fetch state for each project
    // But this query is likely rare (only on asset deletion)
    const projectsUsingAsset = [];

    for (const project of projects) {
      // Fetch project state
      const projectState = await ctx.db
        .query("projectStates")
        .withIndex("by_projectId", (q) => q.eq("projectId", project._id))
        .first();

      // Fallback to legacy canvasState if not found in new table (during migration)
      const canvasState =
        projectState?.canvasState ?? (project as any).canvasState;

      if (!canvasState) continue;

      const hasAsset = canvasState.elements.some(
        (element: any) => element.assetId === args.assetId,
      );

      if (hasAsset) {
        projectsUsingAsset.push({
          projectId: project._id,
          projectName: project.name,
          elementCount: canvasState.elements.filter(
            (e: any) => e.assetId === args.assetId,
          ).length,
        });
      }
    }

    return projectsUsingAsset;
  },
});
