import { useState, useEffect } from "react";
import type { PlacedImage, PlacedVideo } from "@/types/canvas";

export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export function useCanvasState() {
  const [images, setImages] = useState<PlacedImage[]>([]);
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
