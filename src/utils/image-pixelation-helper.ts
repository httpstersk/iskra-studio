import { createPixelatedCloneCanvas } from "./glsl-pixelate";

/**
 * Default pixel size for generated image overlays
 */
const DEFAULT_PIXEL_SIZE = 20;

/**
 * Generates a pixelated version of an image for overlay display
 * 
 * @param imageUrl - URL of the source image
 * @param targetWidth - Width to render the pixelated version
 * @param targetHeight - Height to render the pixelated version
 * @param pixelSize - Size of pixel blocks (default: 20)
 * @returns Data URL of the pixelated canvas, or undefined if generation fails
 */
export async function generatePixelatedOverlay(
  imageUrl: string,
  targetWidth: number,
  targetHeight: number,
  pixelSize: number = DEFAULT_PIXEL_SIZE
): Promise<string | undefined> {
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
    return pixelatedCanvas.toDataURL("image/png");
  } catch (error) {
    console.error("Failed to generate pixelated overlay:", error);
    return undefined;
  }
}
