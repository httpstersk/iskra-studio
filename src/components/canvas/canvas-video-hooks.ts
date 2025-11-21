/**
 * Custom hooks for CanvasVideo component
 *
 * These hooks handle video-specific loading and overlay management
 * for optimal canvas performance.
 *
 * @module components/canvas/canvas-video-hooks
 */

import { getCachedPixelatedImage } from "@/utils/image-cache";
import useImage from "use-image";

/**
 * Custom hook to load pixelated overlay image if available.
 * Checks cache first for immediate rendering, then falls back to loading.
 *
 * Note: Uses `use-image` package for video overlays (vs useImageCache for images)
 * to maintain consistent behavior with video element loading.
 *
 * @param pixelatedSrc - Optional pixelated overlay source URL
 * @returns Loaded pixelated image element or undefined
 */
export const useVideoPixelatedOverlay = (
  pixelatedSrc: string | undefined
): HTMLImageElement | undefined => {
  const cachedImage = pixelatedSrc
    ? getCachedPixelatedImage(pixelatedSrc)
    : undefined;

  const [loadedImg] = useImage(
    pixelatedSrc && !cachedImage ? pixelatedSrc : "",
    "anonymous"
  );

  if (!pixelatedSrc) return undefined;

  return cachedImage || loadedImg;
};
