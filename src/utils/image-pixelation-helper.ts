import { createPixelatedCloneCanvas } from "./glsl-pixelate";

/**
 * Default pixel size for generated image overlays
 */
const DEFAULT_PIXEL_SIZE = 20;

/**
 * Generates a pixelated version of an image for overlay display
 * Returns both data URL and preloaded Image element for immediate use
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
  pixelSize: number = DEFAULT_PIXEL_SIZE
): Promise<{ dataUrl: string; image: HTMLImageElement } | undefined> {
  try {
    // Load the source image
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = imageUrl;
    });

    // Generate pixelated version using GLSL shader
    const pixelatedCanvas = createPixelatedCloneCanvas(
      img,
      targetWidth,
      targetHeight,
      pixelSize
    );

    // Convert to data URL for storage
    const dataUrl = pixelatedCanvas.toDataURL("image/png");

    // Preload the image so it's ready immediately for rendering
    const preloadedImg = new window.Image();
    await new Promise<void>((resolve, reject) => {
      preloadedImg.onload = () => resolve();
      preloadedImg.onerror = () => reject(new Error("Failed to preload pixelated image"));
      preloadedImg.src = dataUrl;
    });

    return { dataUrl, image: preloadedImg };
  } catch (error) {
    console.error("Failed to generate pixelated overlay:", error);
    return undefined;
  }
}
