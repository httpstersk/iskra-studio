/**
 * Convex project management functions.
 *
 * Handles CRUD operations for user projects (canvas workspaces),
 * including creation, saving, loading, deletion, and renaming.
 */

import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
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

    // Create project with empty canvas state
    const projectId = await ctx.db.insert("projects", {
      userId,
      name: projectName,
      canvasState: {
        elements: [],
        lastModified: now,
      },
      lastSavedAt: now,
      createdAt: now,
      updatedAt: now,
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

    // Get project
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Verify ownership
    if (project.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Validate canvas state
    if (args.canvasState.elements.length > 1000) {
      throw new Error("Too many canvas elements (max 1000)");
    }

    const now = Date.now();

    // Update project
    await ctx.db.patch(args.projectId, {
      canvasState: args.canvasState,
      thumbnailStorageId: args.thumbnailStorageId,
      lastSavedAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(args.projectId);
  },
});

/**
 * Lists all projects for the authenticated user.
 *
 * Includes asset thumbnail URLs for efficient list rendering.
 *
 * @param limit - Maximum number of projects to return (default: 50)
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
    const limit = args.limit ?? 50;

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
 *
 * @param projectId - ID of the project to retrieve
 * @returns Project record with asset thumbnails
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

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Verify ownership
    if (project.userId !== identity.subject) {
      throw new Error("Unauthorized");
    }

    // Get thumbnail URL if exists
    let thumbnailUrl: string | undefined;
    if (project.thumbnailStorageId) {
      const url = await ctx.storage.getUrl(project.thumbnailStorageId);
      thumbnailUrl = url ?? undefined;
    }

    // Collect asset IDs from project elements
    const assetIds = new Set<string>();
    for (const element of project.canvasState.elements) {
      if (element.assetId) {
        assetIds.add(element.assetId);
      }
    }

    // Fetch asset thumbnails for canvas display (optimize bandwidth on load)
    // Use db.get() directly for better performance
    const assetThumbnails: Record<string, string> = {};
    for (const assetId of assetIds) {
      try {
        const asset = (await ctx.db.get(
          assetId as any,
        )) as Doc<"assets"> | null;
        if (asset && asset.thumbnailStorageId) {
          const thumbUrl = await ctx.storage.getUrl(asset.thumbnailStorageId);
          if (thumbUrl) {
            assetThumbnails[assetId] = thumbUrl;
          }
        }
      } catch (error) {
        // Asset might have been deleted, skip it
        console.warn(`Asset ${assetId} not found or deleted`);
      }
    }

    return {
      ...project,
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

    // Get project
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    // Verify ownership
    if (project.userId !== identity.subject) {
      throw new Error("Unauthorized");
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
