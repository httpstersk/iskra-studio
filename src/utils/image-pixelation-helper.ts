import { CANVAS_GRID } from "@/constants/canvas";

import { createPixelatedCloneCanvas } from "./glsl-pixelate";
import { cachePixelatedImage } from "./image-cache";
import { yieldToMainThread } from "./scheduler-helpers";

/**
 * Default pixel size for generated image overlays
 */
const DEFAULT_PIXEL_SIZE = CANVAS_GRID.PIXEL_SIZE;

/**
 * Interface for image dimensions
 */
interface ImageDimensions {
  height: number;
  src: string;
  width: number;
}

/**
 * Generates a pixelated version of an image for overlay display
 * Returns both data URL and preloaded Image element for immediate use
 *
 * Uses ESNext features: createImageBitmap + Scheduler.yield() for performance
 *
 * @param imageUrl - URL of the source image
 * @param targetWidth - Width to render the pixelated version
 * @param targetHeight - Height to render the pixelated version
 * @param pixelSize - Size of pixel blocks (default: 20)
 * @returns Object with dataUrl and preloaded image element, or undefined if generation fails
 */
export async function generatePixelatedOverlay(
  imageUrl: string,
  targetWidth: number,
  targetHeight: number,
  pixelSize: number = DEFAULT_PIXEL_SIZE,
): Promise<{ dataUrl: string; image: HTMLImageElement } | undefined> {
  try {
    // Load the source image using modern createImageBitmap API (30-50% faster decode)
    // Fallback to Image() for older browsers
    let imageSource: HTMLImageElement | HTMLCanvasElement;

    if ("createImageBitmap" in window) {
      // Modern browsers: Use createImageBitmap for faster decode
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const imageBitmap = await createImageBitmap(blob);

      // Yield after decode to keep UI responsive
      await yieldToMainThread();

      // Convert ImageBitmap to canvas for compatibility with existing pixelation logic
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = imageBitmap.width;
      tempCanvas.height = imageBitmap.height;
      const ctx = tempCanvas.getContext("2d");

      if (!ctx) {
        // Fallback to traditional loading if canvas context fails
        const fallbackImg = new window.Image();
        fallbackImg.crossOrigin = "anonymous";

        await new Promise<void>((resolve, reject) => {
          fallbackImg.onload = () => resolve();
          fallbackImg.onerror = () =>
            reject(new Error("Failed to load fallback image"));
          fallbackImg.src = imageUrl;
        });

        imageSource = fallbackImg;
      } else {
        ctx.drawImage(imageBitmap, 0, 0);
        imageBitmap.close(); // Free memory immediately
        imageSource = tempCanvas;
      }
    } else {
      // Fallback: Traditional Image loading for older browsers
      const imageElement: HTMLImageElement = new (
        window as typeof globalThis
      ).Image();
      imageElement.crossOrigin = "anonymous";

      await new Promise<void>((resolve, reject) => {
        imageElement.onload = () => resolve();
        imageElement.onerror = () => reject(new Error("Failed to load image"));
        imageElement.src = imageUrl;
      });

      imageSource = imageElement;
    }

    // Yield before heavy GLSL processing
    await yieldToMainThread();

    // Generate pixelated version using GLSL shader
    const pixelatedCanvas = createPixelatedCloneCanvas(
      imageSource as HTMLImageElement,
      targetWidth,
      targetHeight,
      pixelSize,
    );

    // Convert to data URL for storage
    const dataUrl = pixelatedCanvas.toDataURL("image/png");

    // Yield after GLSL processing before final image load
    await yieldToMainThread();

    // Preload the image so it's ready immediately for rendering
    const preloadedImg = new window.Image();

    await new Promise<void>((resolve, reject) => {
      preloadedImg.onload = () => resolve();
      preloadedImg.onerror = () =>
        reject(new Error("Failed to preload pixelated image"));
      preloadedImg.src = dataUrl;
    });

    return { dataUrl, image: preloadedImg };
  } catch (_error) {
    return undefined;
  }
}

/**
 * Generates and caches a pixelated overlay for an image with immediate visual feedback.
 *
 * This helper function combines pixelated overlay generation with caching to provide
 * optimistic UI updates for placeholder images during generation.
 *
 * @param selectedImage - Image object containing src, width, and height
 * @param pixelSize - Size of pixel blocks (default: 20)
 * @returns Pixelated image data URL if successful, undefined otherwise
 */
export async function generateAndCachePixelatedOverlay(
  selectedImage: ImageDimensions,
  pixelSize: number = DEFAULT_PIXEL_SIZE,
): Promise<string | undefined> {
  const result = await generatePixelatedOverlay(
    selectedImage.src,
    selectedImage.width,
    selectedImage.height,
    pixelSize,
  );

  if (result) {
    cachePixelatedImage(result.dataUrl, result.image);
    return result.dataUrl;
  }

  return undefined;
}
