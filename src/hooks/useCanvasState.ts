import { useState, useEffect, useCallback } from "react";
import type { SetStateAction } from "react";
import type { PlacedImage, PlacedVideo } from "@/types/canvas";
import { snapImagesToGrid } from "@/utils/snap-utils";

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export function useCanvasState() {
  const [images, setImagesState] = useState<PlacedImage[]>([]);
  const [videos, setVideos] = useState<PlacedVideo[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewport, setViewport] = useState<Viewport>({
    x: 0,
    y: 0,
    scale: 1,
  });
  const [canvasSize, setCanvasSize] = useState({
    width: 1200,
    height: 800,
  });
  const [isCanvasReady, setIsCanvasReady] = useState(false);

  // Update canvas size on window resize
  useEffect(() => {
    const updateCanvasSize = () => {
      setCanvasSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);
    return () => window.removeEventListener("resize", updateCanvasSize);
  }, []);

  // Set canvas ready state after mount
  useEffect(() => {
    if (canvasSize.width > 0 && canvasSize.height > 0) {
      setIsCanvasReady(true);
    }
  }, [canvasSize]);

  const setImages = useCallback((value: SetStateAction<PlacedImage[]>) => {
    setImagesState((prev) => {
      const nextState =
        typeof value === "function"
          ? (value as (prev: PlacedImage[]) => PlacedImage[])(prev)
          : value;

      const snapped = snapImagesToGrid(nextState);
      return snapped;
    });
  }, []);

  return {
    images,
    setImages,
    videos,
    setVideos,
    selectedIds,
    setSelectedIds,
    viewport,
    setViewport,
    canvasSize,
    isCanvasReady,
  };
}
