import { useEffect } from "react";
import type { PlacedImage } from "@/types/canvas";
import { DEFAULT_IMAGES, CANVAS_DIMENSIONS } from "@/constants/canvas";
import { snapPosition } from "@/utils/snap-utils";

/**
 * Hook to load default images when canvas is empty
 * @param isStorageLoaded - Whether storage has been loaded
 * @param imagesLength - Current number of images
 * @param canvasSize - Canvas dimensions
 * @param setImages - Function to set images
 */
export function useDefaultImages(
  isStorageLoaded: boolean,
  imagesLength: number,
  canvasSize: { height: number; width: number },
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>,
) {
  useEffect(() => {
    if (!isStorageLoaded || imagesLength > 0) return;

    const loadDefaultImages = async () => {
      const defaultImagePaths = DEFAULT_IMAGES.PATHS;

      for (let i = 0; i < defaultImagePaths.length; i++) {
        const path = defaultImagePaths[i];
        try {
          const response = await fetch(path);
          const blob = await response.blob();
          const reader = new FileReader();

          reader.onload = (e) => {
            const img = new window.Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              const id = `default-${path.replace("/", "").replace(".png", "")}-${Date.now()}`;
              const aspectRatio = img.width / img.height;
              const maxSize = CANVAS_DIMENSIONS.DEFAULT_MAX_SIZE;
              let width = maxSize;
              let height = maxSize / aspectRatio;

              if (height > maxSize) {
                height = maxSize;
                width = maxSize * aspectRatio;
              }

              const spacing = CANVAS_DIMENSIONS.DEFAULT_SPACING;
              const totalWidth = spacing * (defaultImagePaths.length - 1);
              const viewportCenterX = canvasSize.width / 2;
              const viewportCenterY = canvasSize.height / 2;
              const startX = viewportCenterX - totalWidth / 2;
              const x = startX + i * spacing - width / 2;
              const y = viewportCenterY - height / 2;
              const snapped = snapPosition(x, y);

              setImages((prev) => [
                ...prev,
                {
                  height,
                  id,
                  rotation: 0,
                  src: e.target?.result as string,
                  width,
                  x: snapped.x,
                  y: snapped.y,
                },
              ]);
            };
            img.src = e.target?.result as string;
          };

          reader.readAsDataURL(blob);
        } catch (error) {
          console.error(`Failed to load default image ${path}:`, error);
        }
      }
    };

    loadDefaultImages();
  }, [isStorageLoaded, imagesLength, canvasSize, setImages]);
}
