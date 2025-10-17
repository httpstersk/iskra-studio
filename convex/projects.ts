/**
 * Convex project management functions.
 * 
 * Handles CRUD operations for user projects (canvas workspaces),
 * including creation, saving, loading, deletion, and renaming.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Migrates canvas state from old format (imageId/videoId) to new format (assetId).
 * 
 * @param canvasState - Canvas state that may have old field names
 * @returns Migrated canvas state with assetId fields
 */
function migrateCanvasStateToAssetId(canvasState: any) {
  return {
    ...canvasState,
    elements: canvasState.elements.map((element: any) => {
      // If already has assetId, return as-is
      if (element.assetId) {
        const { imageId, videoId, ...rest } = element;
        return rest;
      }

      // Migrate from old format
      const migrated: any = { ...element };
      
      // Copy imageId or videoId to assetId and remove old field
      if (element.imageId) {
        migrated.assetId = element.imageId;
        migrated.assetType = "image";
        delete migrated.imageId;
      } else if (element.videoId) {
        migrated.assetId = element.videoId;
        migrated.assetType = "video";
        delete migrated.videoId;
      }

      return migrated;
    }),
  };
}

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
          assetType: v.optional(v.union(v.literal("image"), v.literal("video"))),
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
          type: v.union(v.literal("image"), v.literal("video"), v.literal("text"), v.literal("shape")),
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

    // Migrate canvas state to new format if needed
    const migratedCanvasState = migrateCanvasStateToAssetId(args.canvasState);

    // Validate canvas state
    if (migratedCanvasState.elements.length > 1000) {
      throw new Error("Too many canvas elements (max 1000)");
    }

    const now = Date.now();

    // Update project
    await ctx.db.patch(args.projectId, {
      canvasState: migratedCanvasState,
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
 * @param limit - Maximum number of projects to return (default: 50)
 * @returns Array of projects sorted by lastSavedAt DESC
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

    // Convert to include storage URLs for thumbnails and migrate data
    const projectsWithUrls = await Promise.all(
      projects.map(async (project) => {
        let thumbnailUrl: string | undefined;
        if (project.thumbnailStorageId) {
          const url = await ctx.storage.getUrl(project.thumbnailStorageId);
          thumbnailUrl = url ?? undefined;
        }

        // Migrate canvas state to new format if needed
        const migratedCanvasState = migrateCanvasStateToAssetId(project.canvasState);

        return {
          ...project,
          canvasState: migratedCanvasState,
          thumbnailUrl,
        };
      })
    );

    return projectsWithUrls;
  },
});

/**
 * Gets a single project by ID with ownership verification.
 * 
 * @param projectId - ID of the project to retrieve
 * @returns Project record
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

    // Migrate canvas state to new format if needed
    const migratedProject = {
      ...project,
      canvasState: migrateCanvasStateToAssetId(project.canvasState),
    };

    // Get thumbnail URL if exists
    let thumbnailUrl: string | undefined;
    if (project.thumbnailStorageId) {
      const url = await ctx.storage.getUrl(project.thumbnailStorageId);
      thumbnailUrl = url ?? undefined;
    }

    return {
      ...migratedProject,
      thumbnailUrl,
    };
  },
});

/**
 * Deletes a project and its associated thumbnail.
 * 
 * Referenced assets are kept (they may be used in other projects).
 * 
 * @param projectId - ID of the project to delete
 */
export const deleteProject = mutation({
  args: {
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

    // Delete thumbnail from storage if exists
    if (project.thumbnailStorageId) {
      try {
        await ctx.storage.delete(project.thumbnailStorageId);
      } catch (error) {
        console.error("Failed to delete project thumbnail:", error);
        // Continue with project deletion even if thumbnail deletion fails
      }
    }

    // Delete project record
    await ctx.db.delete(args.projectId);
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
