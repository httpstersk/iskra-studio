import { useCallback } from "react";
import type { PlacedImage } from "@/types/canvas";
import type { Viewport } from "./useCanvasState";

export function useFileUpload(
  setImages: (fn: (prev: PlacedImage[]) => PlacedImage[]) => void,
  viewport: Viewport,
  canvasSize: { width: number; height: number }
) {
  const handleFileUpload = useCallback(
    (files: FileList | null, position?: { x: number; y: number }) => {
      if (!files) return;

      Array.from(files).forEach((file, index) => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const id = `img-${Date.now()}-${Math.random()}`;
            const img = new window.Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              const aspectRatio = img.width / img.height;
              const maxSize = 300;
              let width = maxSize;
              let height = maxSize / aspectRatio;

              if (height > maxSize) {
                height = maxSize;
                width = maxSize * aspectRatio;
              }

              let x, y;
              if (position) {
                x = (position.x - viewport.x) / viewport.scale - width / 2;
                y = (position.y - viewport.y) / viewport.scale - height / 2;
              } else {
                const viewportCenterX =
                  (canvasSize.width / 2 - viewport.x) / viewport.scale;
                const viewportCenterY =
                  (canvasSize.height / 2 - viewport.y) / viewport.scale;
                x = viewportCenterX - width / 2;
                y = viewportCenterY - height / 2;
              }

              if (index > 0) {
                x += index * 20;
                y += index * 20;
              }

              setImages((prev) => [
                ...prev,
                {
                  id,
                  src: e.target?.result as string,
                  x,
                  y,
                  width,
                  height,
                  rotation: 0,
                },
              ]);
            };
            img.src = e.target?.result as string;
          };
          reader.readAsDataURL(file);
        }
      });
    },
    [setImages, viewport, canvasSize]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, stageRef: React.RefObject<any>) => {
      e.preventDefault();

      const stage = stageRef.current;
      if (stage) {
        const container = stage.container();
        const rect = container.getBoundingClientRect();
        const dropPosition = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        handleFileUpload(e.dataTransfer.files, dropPosition);
      } else {
        handleFileUpload(e.dataTransfer.files);
      }
    },
    [handleFileUpload]
  );

  return {
    handleFileUpload,
    handleDrop,
  };
}
