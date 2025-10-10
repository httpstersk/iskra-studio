/**
 * Canvas state hook using Jotai
 * Provides access to canvas state atoms and manages window resize effects
 */

import { useEffect, useRef } from "react";
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

  const hasInitialized = useRef(false);

  // Update canvas size on window resize
  useEffect(() => {
    const updateCanvasSize = () => {
      setCanvasSize({
        height: window.innerHeight,
        width: window.innerWidth,
      });
    };

    // Set initial size on mount
    if (!hasInitialized.current) {
      updateCanvasSize();
      hasInitialized.current = true;
    }

    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, [setCanvasSize]);

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
