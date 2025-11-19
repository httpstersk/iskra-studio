/**
 * Canvas state hook using Jotai
 * Provides access to canvas state atoms and manages window resize effects
 */

import { useEffect } from "react";
import { useAtom } from "jotai";
import {
  canvasSizeAtom,
  imagesAtom,
  isCanvasReadyAtom,
  selectedIdsAtom,
  videosAtom,
  viewportAtom,
  type Viewport,
} from "@/store/canvas-atoms";
import { useWindowDimensions } from "./useWindowDimensions";

/**
 * Hook to manage canvas state using Jotai atoms
 * Handles window resize and canvas readiness
 */
export function useCanvasState() {
  const [canvasSize, setCanvasSize] = useAtom(canvasSizeAtom);
  const [images, setImages] = useAtom(imagesAtom);
  const [isCanvasReady, setIsCanvasReady] = useAtom(isCanvasReadyAtom);
  const [selectedIds, setSelectedIds] = useAtom(selectedIdsAtom);
  const [videos, setVideos] = useAtom(videosAtom);
  const [viewport, setViewport] = useAtom(viewportAtom);

  // Get window dimensions from external store
  // Single shared subscription for all components using this hook
  const windowDimensions = useWindowDimensions();

  // Sync window dimensions to canvas size atom
  useEffect(() => {
    setCanvasSize({
      height: windowDimensions.height,
      width: windowDimensions.width,
    });
  }, [windowDimensions.height, windowDimensions.width, setCanvasSize]);

  // Set canvas ready state after mount
  useEffect(() => {
    if (canvasSize.width > 0 && canvasSize.height > 0 && !isCanvasReady) {
      setIsCanvasReady(true);
    }
  }, [canvasSize.height, canvasSize.width, isCanvasReady, setIsCanvasReady]);

  return {
    canvasSize,
    images,
    isCanvasReady,
    selectedIds,
    setImages,
    setSelectedIds,
    setVideos,
    setViewport,
    videos,
    viewport,
  };
}

export type { Viewport };
