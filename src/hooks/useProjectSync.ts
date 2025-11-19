/**
 * Hook to synchronize UI state when switching projects
 * Handles clearing selections and other UI-only state changes
 */

"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAtom } from "jotai";
import { currentProjectAtom } from "@/store/project-atoms";
import { selectedIdsAtom } from "@/store/canvas-atoms";

/**
 * Hook to sync UI state with the current project
 *
 * This hook clears selections when switching between projects.
 * Canvas element loading (images/videos) is handled by useStorage.
 */
export function useProjectSync() {
  const [currentProject] = useAtom(currentProjectAtom);
  const [, setSelectedIds] = useAtom(selectedIdsAtom);

  // Track the last synced project ID to avoid re-syncing on object reference changes
  const lastSyncedProjectIdRef = useRef<string | null>(null);

  // Clear selection when project changes
  useEffect(() => {
    if (currentProject) {
      // Only clear if the project ID actually changed (not just the object reference)
      if (lastSyncedProjectIdRef.current !== currentProject._id) {
        setSelectedIds([]);
        lastSyncedProjectIdRef.current = currentProject._id;
      }
    } else {
      // Reset when project is cleared
      lastSyncedProjectIdRef.current = null;
      setSelectedIds([]);
    }
  }, [currentProject, setSelectedIds]);

  /**
   * No-op function for backward compatibility.
   * With the new implementation, if loadProject fails, currentProject won't update,
   * so the canvas state remains unchanged automatically. No manual restoration needed.
   */
  const restoreLastGoodState = useCallback(() => {
    // No-op: Error recovery is now handled automatically by useStorage
  }, []);

  return {
    restoreLastGoodState,
  };
}
