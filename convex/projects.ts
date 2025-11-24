/**
 * Convex project management functions.
 *
 * Handles CRUD operations for user projects (canvas workspaces),
 * including creation, saving, loading, deletion, and renaming.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Creates a new project with default name and empty canvas state.
 *
 * @param name - Optional project name (defaults to "Iskra Project")
 * @returns Project ID
 */
export const createProject = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const now = Date.now();

    // Validate project name if provided
    if (args.name && args.name.length > 100) {
      throw new Error("Project name too long (max 100 characters)");
    }

    // Count existing projects to generate default name
    const existingProjects = await ctx.db
      .query("projects")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Limit number of projects per user
    if (existingProjects.length >= 100) {
      throw new Error("Maximum number of projects reached (100)");
    }

    const defaultName = `Iskra Project ${String(existingProjects.length + 1).padStart(2, "0")}`;
    const projectName = args.name || defaultName;

    // Create project record
    const projectId = await ctx.db.insert("projects", {
      userId,
      name: projectName,
      imageCount: 0,
      videoCount: 0,
      lastSavedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    // Create initial project state
    await ctx.db.insert("projectStates", {
      projectId,
      canvasState: {
        elements: [],
        lastModified: now,
      },
    });

    return projectId;
  },
});

/**
 * Saves or updates a project's canvas state.
 *
 * @param projectId - Project ID to update
 * @param canvasState - Complete canvas state to save
 * @param thumbnailStorageId - Optional thumbnail storage ID
 * @returns Updated project
 */
export const saveProject = mutation({
  args: {
    canvasState: v.object({
      backgroundColor: v.optional(v.string()),
      elements: v.array(
        v.object({
          assetId: v.optional(v.string()),
          assetSyncedAt: v.optional(v.number()),
          assetType: v.optional(
            v.union(v.literal("image"), v.literal("video")),
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
            v.literal("shape"),
          ),
          volume: v.optional(v.number()),
          width: v.optional(v.number()),
          zIndex: v.number(),
        }),
      ),
      lastModified: v.number(),
      viewport: v.optional(
        v.object({
          scale: v.number(),
          x: v.number(),
          y: v.number(),
        }),
      ),
    }),
    projectId: v.id("projects"),
    thumbnailStorageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Use index-based query to prevent IDOR timing attacks
    // Only fetch projects owned by the authenticated user
    const project = await ctx.db
      .query("projects")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.projectId))
      .first();

    if (!project) {
      // Unified error prevents user enumeration
      throw new Error("Project not found or access denied");
    }

    // Validate canvas state
    if (args.canvasState.elements.length > 1000) {
      throw new Error("Too many canvas elements (max 1000)");
    }

    const now = Date.now();

    // Calculate counts
    const imageCount = args.canvasState.elements.filter(
      (e) => e.type === "image"
    ).length;
    const videoCount = args.canvasState.elements.filter(
      (e) => e.type === "video"
    ).length;

    // Update project metadata
    await ctx.db.patch(args.projectId, {
      thumbnailStorageId: args.thumbnailStorageId,
      imageCount,
      videoCount,
      lastSavedAt: now,
      updatedAt: now,
    });

    // Update project state
    const projectState = await ctx.db
      .query("projectStates")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .first();

    if (projectState) {
      await ctx.db.patch(projectState._id, {
        canvasState: args.canvasState,
      });
    } else {
      // Handle case where state might be missing (e.g. migration issue)
      await ctx.db.insert("projectStates", {
        projectId: args.projectId,
        canvasState: args.canvasState,
      });
    }

    return await ctx.db.get(args.projectId);
  },
});

/**
 * Lists all projects for the authenticated user.
 *
 * Includes asset thumbnail URLs for efficient list rendering.
 * Does NOT include heavy canvasState.
 *
 * @param limit - Maximum number of projects to return (default: 20, max: 100)
 * @returns Array of projects sorted by lastSavedAt DESC with asset thumbnails
 */
export const listProjects = query({
  args: {
    limit: v.optional(v.number()),
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

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    // Convert to include storage URLs for project thumbnails only
    // Asset thumbnails are fetched on-demand when opening a project
    const projectsWithUrls = await Promise.all(
      projects.map(async (project) => {
        let thumbnailUrl: string | undefined;
        if (project.thumbnailStorageId) {
          const url = await ctx.storage.getUrl(project.thumbnailStorageId);
          thumbnailUrl = url ?? undefined;
        }

        return {
          ...project,
          thumbnailUrl,
        };
      }),
    );

    return projectsWithUrls;
  },
});

/**
 * Gets a single project by ID with ownership verification.
 *
 * Includes asset thumbnail URLs for display (full-size URLs available on-demand).
 * Fetches canvasState from project_states table.
 *
 * @param projectId - ID of the project to retrieve
 * @returns Project record with asset thumbnails and canvasState
 */
export const getProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Use index-based query to prevent IDOR timing attacks
    // Only fetch projects owned by the authenticated user
    const project = await ctx.db
      .query("projects")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.projectId))
      .first();

    if (!project) {
      // Unified error prevents user enumeration
      throw new Error("Project not found or access denied");
    }

    // Fetch project state
    const projectState = await ctx.db
      .query("projectStates")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .first();

    // Fallback to legacy canvasState if not found in new table (during migration)
    const canvasState = projectState?.canvasState ?? (project as any).canvasState;

    if (!canvasState) {
      throw new Error("Project state not found");
    }

    // Get thumbnail URL if exists
    let thumbnailUrl: string | undefined;
    if (project.thumbnailStorageId) {
      const url = await ctx.storage.getUrl(project.thumbnailStorageId);
      thumbnailUrl = url ?? undefined;
    }

    // Collect asset IDs from project elements
    const assetIds = new Set<string>();
    for (const element of canvasState.elements) {
      if (element.assetId) {
        assetIds.add(element.assetId);
      }
    }

    // Fetch asset thumbnails for canvas display (optimize bandwidth on load)
    // IMPORTANT: Only fetch assets owned by the user to prevent IDOR
    // Batch fetch all user's assets, then filter to project assets
    const userAssets = await ctx.db
      .query("assets")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const assetMap = new Map(userAssets.map((a) => [a._id, a]));
    const assetThumbnails: Record<string, string> = {};

    for (const assetId of assetIds) {
      const asset = assetMap.get(assetId as any);
      if (asset && asset.thumbnailStorageId) {
        const thumbUrl = await ctx.storage.getUrl(asset.thumbnailStorageId);
        if (thumbUrl) {
          assetThumbnails[assetId] = thumbUrl;
        }
      }
    }

    return {
      ...project,
      canvasState, // Inject canvasState from separate table
      thumbnailUrl,
      assetThumbnails,
    };
  },
});

/**
 * Renames a project.
 *
 * @param projectId - ID of the project to rename
 * @param name - New project name
 */
export const renameProject = mutation({
  args: {
    name: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Use index-based query to prevent IDOR timing attacks
    // Only fetch projects owned by the authenticated user
    const project = await ctx.db
      .query("projects")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("_id"), args.projectId))
      .first();

    if (!project) {
      // Unified error prevents user enumeration
      throw new Error("Project not found or access denied");
    }

    // Validate name
    if (!args.name.trim()) {
      throw new Error("Project name cannot be empty");
    }

    if (args.name.length > 100) {
      throw new Error("Project name too long (max 100 characters)");
    }

    // Update project name
    await ctx.db.patch(args.projectId, {
      name: args.name.trim(),
      updatedAt: Date.now(),
    });
  },
});
