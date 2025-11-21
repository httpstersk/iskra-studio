import { useEffect } from "react";
import type { PlacedImage } from "@/types/canvas";
import { DEFAULT_IMAGES, CANVAS_DIMENSIONS } from "@/constants/canvas";
import { snapPosition } from "@/utils/snap-utils";
import { tryPromise, isErr } from "@/lib/errors/safe-errors";

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
          const fetchResult = await tryPromise(fetch(path));
          if (isErr(fetchResult)) {
            continue; // Skip this image on error
          }

          const blobResult = await tryPromise(fetchResult.blob());
          if (isErr(blobResult)) {
            continue; // Skip this image on error
          }

          const blob = blobResult;
          const reader = new FileReader();

          reader.onload = async (e) => {
            const img = new window.Image();

            img.crossOrigin = "anonymous";
            img.onload = async () => {
              const id = `default-${path.replace("/", "").replace(".png", "")}-${Date.now()}`;

              // Crop image to 16:9 aspect ratio
              const { cropImageUrlToAspectRatio } = await import(
                "@/utils/image-crop-utils"
              );

              const croppedResult = await cropImageUrlToAspectRatio(
                e.target?.result as string,
              );

              const aspectRatio = croppedResult.width / croppedResult.height;
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
                  src: croppedResult.croppedSrc,
                  width,
                  x: snapped.x,
                  y: snapped.y,
                  naturalWidth: croppedResult.width,
                  naturalHeight: croppedResult.height,
                },
              ]);
            };
            img.src = e.target?.result as string;
          };

          reader.readAsDataURL(blob);
        } catch (_error) {}
      }
    };

    loadDefaultImages();
  }, [isStorageLoaded, imagesLength, canvasSize, setImages]);
}
