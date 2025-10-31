/**
 * Custom hook to ensure a project exists before performing actions.
 *
 * Automatically creates a new project if user is authenticated but has no active project.
 * Prevents duplicate project creation during concurrent operations.
 */

"use client";

import { showInfo } from "@/lib/toast";
import { useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import { useProjects } from "./useProjects";

/**
 * Return type for the useProjectGuard hook.
 */
interface UseProjectGuardReturn {
  /** Ensures a project exists, creating one if necessary */
  ensureProject: () => Promise<boolean>;

  /** Whether a project is currently active */
  hasProject: boolean;
}

/**
 * Custom hook to guard actions that require an active project.
 *
 * Provides a function to ensure a project exists before executing actions.
 * Automatically creates a new project for authenticated users without one.
 *
 * @remarks
 * - Only creates projects for authenticated users
 * - Prevents duplicate creation during concurrent operations
 * - Shows subtle notification when auto-creating
 * - Returns false if user is not authenticated
 *
 * @example
 * ```tsx
 * function ImageUploader() {
 *   const { ensureProject, hasProject } = useProjectGuard();
 *
 *   const handleUpload = async (files: FileList) => {
 *     // Ensure project exists before uploading
 *     const projectReady = await ensureProject();
 *     if (!projectReady) return;
 *
 *     // Continue with upload...
 *   };
 *
 *   return <div>...</div>;
 * }
 * ```
 */
export function useProjectGuard(): UseProjectGuardReturn {
  const { isAuthenticated } = useAuth();
  const { currentProject, createProject, loadProject } = useProjects();

  // Track if project creation is in progress to prevent duplicates
  const isCreatingRef = useRef(false);
  const creationPromiseRef = useRef<Promise<boolean> | null>(null);

  /**
   * Ensures a project exists, creating one if necessary.
   *
   * @returns True if project exists or was created, false if user not authenticated
   */
  const ensureProject = useCallback(async (): Promise<boolean> => {
    // User must be authenticated
    if (!isAuthenticated) {
      return false;
    }

    // Project already exists
    if (currentProject) {
      return true;
    }

    // If already creating, wait for existing creation to complete
    if (isCreatingRef.current && creationPromiseRef.current) {
      return creationPromiseRef.current;
    }

    // Start project creation
    isCreatingRef.current = true;

    const creationPromise = (async () => {
      try {
        // Create project with default naming
        const projectId = await createProject();

        // Load the newly created project
        await loadProject(projectId);

        // Show subtle notification
        showInfo("Project created", "Your work will be automatically saved");

        return true;
      } catch (error) {
        console.error("Failed to auto-create project:", error);
        // Don't show error toast - let the action continue locally
        return false;
      } finally {
        isCreatingRef.current = false;
        creationPromiseRef.current = null;
      }
    })();

    creationPromiseRef.current = creationPromise;
    return creationPromise;
  }, [isAuthenticated, currentProject, createProject, loadProject]);

  return {
    ensureProject,
    hasProject: !!currentProject,
  };
}
