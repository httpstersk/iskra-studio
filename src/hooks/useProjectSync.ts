/**
 * Hook to synchronize canvas state with the current project
 * Prevents flicker when switching projects by maintaining state consistency
 */

"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAtom } from "jotai";
import { currentProjectAtom, projectLoadingAtom } from "@/store/project-atoms";
import {
  imagesAtom,
  selectedIdsAtom,
  videosAtom,
  viewportAtom,
} from "@/store/canvas-atoms";
import type { PlacedImage, PlacedVideo } from "@/types/canvas";

/**
 * Hook to sync canvas state with the current project
 *
 * This hook ensures that when the current project changes,
 * the canvas state is immediately updated to match the project's
 * canvas state, preventing flicker during project switches.
 *
 * It also tracks the last known good state to restore from
 * if a project load fails.
 */
export function useProjectSync() {
  const [currentProject] = useAtom(currentProjectAtom);
  const [isLoading] = useAtom(projectLoadingAtom);
  const [images, setImages] = useAtom(imagesAtom);
  const [videos, setVideos] = useAtom(videosAtom);
  const [selectedIds, setSelectedIds] = useAtom(selectedIdsAtom);
  const [viewport, setViewport] = useAtom(viewportAtom);

  // Store last known good project state
  const lastGoodStateRef = useRef<{
    images: PlacedImage[];
    videos: PlacedVideo[];
    selectedIds: string[];
    viewport: { scale: number; x: number; y: number };
  } | null>(null);

  /**
   * Updates canvas state to match the current project
   * Note: The actual canvas state loading is handled by the existing project system
   * This hook mainly focuses on preventing flicker during transitions
   */
  const syncCanvasToProject = useCallback(
    (project: typeof currentProject) => {
      if (!project?.canvasState) return;

      // Clear selection when switching projects
      setSelectedIds([]);

      // Update viewport if available
      if (project.canvasState.viewport) {
        setViewport(project.canvasState.viewport);
      }

      // Store current state as last good state
      lastGoodStateRef.current = {
        images,
        videos,
        selectedIds: [],
        viewport: project.canvasState.viewport || { scale: 1, x: 0, y: 0 },
      };
    },
    [images, videos, setSelectedIds, setViewport]
  );

  /**
   * Restores canvas state from the last known good state
   */
  const restoreLastGoodState = useCallback(() => {
    if (!lastGoodStateRef.current) return;

    const state = lastGoodStateRef.current;
    setImages(state.images);
    setVideos(state.videos);
    setSelectedIds(state.selectedIds);
    setViewport(state.viewport);
  }, [setImages, setVideos, setSelectedIds, setViewport]);

  /**
   * Store current canvas state before project switch
   */
  const storeCurrentState = useCallback(() => {
    lastGoodStateRef.current = {
      images,
      videos,
      selectedIds,
      viewport,
    };
  }, [images, videos, selectedIds, viewport]);

  // Track the last synced project ID to avoid re-syncing on object reference changes
  const lastSyncedProjectIdRef = useRef<string | null>(null);

  // Sync canvas when current project changes (but not when loading)
  useEffect(() => {
    if (!isLoading && currentProject) {
      // Only sync if the project ID actually changed (not just the object reference)
      if (lastSyncedProjectIdRef.current !== currentProject._id) {
        syncCanvasToProject(currentProject);
        lastSyncedProjectIdRef.current = currentProject._id;
      }
    } else if (!currentProject) {
      // Reset when project is cleared
      lastSyncedProjectIdRef.current = null;
    }
  }, [currentProject, isLoading, syncCanvasToProject]);

  // Save current state before potential project switch
  useEffect(() => {
    if (isLoading) {
      storeCurrentState();
    }
  }, [isLoading, storeCurrentState]);

  return {
    restoreLastGoodState,
    storeCurrentState,
    syncCanvasToProject,
  };
}
