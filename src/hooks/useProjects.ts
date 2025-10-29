/**
 * Custom hook for project CRUD operations.
 *
 * Provides functions to create, save, load, delete, and rename projects.
 * Integrates with Convex backend and updates Jotai atoms for state management.
 */

"use client";

import {
  currentProjectAtom,
  isAutoSavingAtom,
  lastSavedAtAtom,
  projectListAtom,
  projectLoadingAtom,
} from "@/store/project-atoms";
import type { CanvasState, Project, ProjectMetadata } from "@/types/project";
import { useConvex, useMutation, useQuery } from "convex/react";
import { useAtom } from "jotai";
import { useCallback, useEffect, useMemo } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useAuth } from "./useAuth";

/**
 * Return type for the useProjects hook.
 */
interface UseProjectsReturn {
  /** Creates a new project with optional name */
  createProject: (name?: string) => Promise<Id<"projects">>;

  /** Current project (null if no project loaded) */
  currentProject: Project | null;

  /** Whether a project is currently loading */
  isLoading: boolean;

  /** Whether auto-save is in progress */
  isSaving: boolean;

  /** Timestamp of last successful save */
  lastSavedAt: number | null;

  /** Loads a project by ID */
  loadProject: (projectId: Id<"projects">) => Promise<void>;

  /** List of all user's projects */
  projects: ProjectMetadata[];

  /** Renames a project */
  renameProject: (projectId: Id<"projects">, name: string) => Promise<void>;

  /** Saves current project canvas state */
  saveProject: (
    projectId: Id<"projects">,
    canvasState: CanvasState,
    thumbnailStorageId?: string
  ) => Promise<void>;
}

/**
 * Custom hook for managing projects.
 *
 * Provides functions for all project operations and maintains
 * project state in Jotai atoms. Automatically handles loading
 * states and error handling.
 *
 * @remarks
 * - All operations require user authentication
 * - Projects are automatically linked to the authenticated user
 * - Failed operations throw errors that should be caught by caller
 *
 * @example
 * ```tsx
 * function ProjectManager() {
 *   const {
 *     projects,
 *     currentProject,
 *     createProject,
 *     loadProject,
 *     saveProject,
 *     isLoading,
 *   } = useProjects();
 *
 *   const handleCreate = async () => {
 *     const projectId = await createProject("My New Project");
 *     await loadProject(projectId);
 *   };
 *
 *   return (
 *     <div>
 *       {projects.map(p => (
 *         <button key={p.id} onClick={() => loadProject(p.id)}>
 *           {p.name}
 *         </button>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useProjects(): UseProjectsReturn {
  // Atoms
  const [currentProject, setCurrentProject] = useAtom(currentProjectAtom);
  const [projectList, setProjectList] = useAtom(projectListAtom);
  const [isLoading, setIsLoading] = useAtom(projectLoadingAtom);
  const [isSaving, setIsSaving] = useAtom(isAutoSavingAtom);
  const [lastSavedAt, setLastSavedAt] = useAtom(lastSavedAtAtom);

  // Auth check
  const { isAuthenticated } = useAuth();
  const convex = useConvex();

  // Convex mutations
  const createProjectMutation = useMutation(api.projects.createProject);
  const saveProjectMutation = useMutation(api.projects.saveProject);
  const renameProjectMutation = useMutation(api.projects.renameProject);

  // Convex queries - only run when authenticated
  const projectsQuery = useQuery(
    api.projects.listProjects,
    isAuthenticated ? { limit: 50 } : "skip"
  );

  // Memoize project list to avoid unnecessary recalculations
  const projectMetadata = useMemo(() => {
    if (!projectsQuery) return null;

    return projectsQuery.map((project) => ({
      id: project._id,
      name: project.name,
      createdAt: project.createdAt,
      lastSavedAt: project.lastSavedAt,
      thumbnailUrl: project.thumbnailUrl,
      imageCount: project.canvasState.elements.filter(
        (el: any) => el.type === "image"
      ).length,
      videoCount: project.canvasState.elements.filter(
        (el: any) => el.type === "video"
      ).length,
    }));
  }, [projectsQuery]);

  // Update project list only when metadata changes
  useEffect(() => {
    if (projectMetadata) {
      setProjectList(projectMetadata);
    }
  }, [projectMetadata, setProjectList]);

  /**
   * Creates a new project.
   */
  const createProject = useCallback(
    async (name?: string): Promise<Id<"projects">> => {
      try {
        const projectId = await createProjectMutation({ name });

        // Refresh project list (will happen automatically via query)
        return projectId;
      } catch (error) {
        throw new Error(
          `Project creation failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    },
    [createProjectMutation]
  );

  /**
   * Loads a project by ID.
   */
  const loadProject = useCallback(
    async (projectId: Id<"projects">): Promise<void> => {
      try {
        setIsLoading(true);

        // Start loading the project data immediately
        // The optimistic UI updates are handled in the ProjectPanel component

        // Pre-fetch project data asynchronously
        const projectPromise = convex.query(api.projects.getProject, {
          projectId,
        });

        const project = await projectPromise;

        if (!project) {
          throw new Error("Project not found");
        }

        const normalizedProject: Project = {
          ...project,
          id: project._id,
        };

        // Update state immediately for instant UI feedback
        setCurrentProject(normalizedProject);
        setLastSavedAt(normalizedProject.lastSavedAt ?? null);

        // Update project list with loaded project data
        setProjectList((prev) => {
          const metadata: ProjectMetadata = {
            id: project._id,
            name: project.name,
            createdAt: project.createdAt,
            lastSavedAt: project.lastSavedAt,
            thumbnailUrl: project.thumbnailUrl,
            imageCount: project.canvasState.elements.filter(
              (el: any) => el.type === "image"
            ).length,
            videoCount: project.canvasState.elements.filter(
              (el: any) => el.type === "video"
            ).length,
          };

          const existingIndex = prev.findIndex((p) => p.id === project._id);

          if (existingIndex === -1) {
            return [metadata, ...prev].sort(
              (a, b) => b.lastSavedAt - a.lastSavedAt
            );
          }

          const updated = [...prev];
          updated[existingIndex] = metadata;
          return updated.sort((a, b) => b.lastSavedAt - a.lastSavedAt);
        });
      } catch (error) {
        throw new Error(
          `Project load failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setIsLoading(false);
      }
    },
    [convex, setCurrentProject, setIsLoading, setLastSavedAt, setProjectList]
  );

  /**
   * Saves project canvas state.
   */
  const saveProject = useCallback(
    async (
      projectId: Id<"projects">,
      canvasState: CanvasState,
      thumbnailStorageId?: string
    ): Promise<void> => {
      try {
        setIsSaving(true);

        await saveProjectMutation({
          projectId,
          canvasState,
          thumbnailStorageId,
        });

        const now = Date.now();
        setLastSavedAt(now);

        // Update current project if it's the one being saved
        if (currentProject?._id === projectId) {
          setCurrentProject({
            ...currentProject,
            canvasState,
            lastSavedAt: now,
            updatedAt: now,
            thumbnailStorageId,
          });
        }
      } catch (error) {
        throw new Error(
          `Project save failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      } finally {
        setIsSaving(false);
      }
    },
    [
      saveProjectMutation,
      currentProject,
      setIsSaving,
      setLastSavedAt,
      setCurrentProject,
    ]
  );

  /**
   * Renames a project.
   */
  const renameProject = useCallback(
    async (projectId: Id<"projects">, name: string): Promise<void> => {
      try {
        await renameProjectMutation({ projectId, name });

        // Update current project if it's the one being renamed
        if (currentProject?._id === projectId) {
          setCurrentProject({
            ...currentProject,
            name,
            updatedAt: Date.now(),
          });
        }

        // Project list will update automatically via query
      } catch (error) {
        throw new Error(
          `Project rename failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    },
    [renameProjectMutation, currentProject, setCurrentProject]
  );

  return {
    createProject,
    currentProject,
    isLoading,
    isSaving,
    lastSavedAt,
    loadProject,
    projects: projectList,
    renameProject,
    saveProject,
  };
}
