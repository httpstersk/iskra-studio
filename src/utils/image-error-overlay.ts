import { CANVAS_GRID } from "@/constants/canvas";
import { createPixelatedWarning } from "./create-pixelated-warning";
import { createRedPixelatedCanvas } from "./glsl-pixelate-red";

const DEFAULT_PIXEL_SIZE = CANVAS_GRID.PIXEL_SIZE;

/**
 * Creates an error overlay for content validation failures
 *
 * Combines a red-tinted pixelated version of the source image with a
 * centered warning sign. The "FAILED" text is displayed separately via
 * the DirectiveLabel component for consistent styling.
 *
 * @param image - Source image element to transform
 * @param width - Target width for the error overlay
 * @param height - Target height for the error overlay
 * @param pixelSize - Size of pixel blocks (default: 20)
 * @returns Data URL of the composed error overlay
 */
export function createErrorOverlay(
  image: HTMLImageElement,
  width: number,
  height: number,
  pixelSize: number = DEFAULT_PIXEL_SIZE,
): string {
  // Create red pixelated background
  const redPixelatedCanvas = createRedPixelatedCanvas(
    image,
    width,
    height,
    pixelSize,
  );

  // Create warning sign (sized relative to canvas dimensions)
  const warningSize = Math.min(width, height) * 0.3; // 30% of smallest dimension
  const warningCanvas = createPixelatedWarning(warningSize);

  // Composite the warning sign onto the red background
  const ctx = redPixelatedCanvas.getContext("2d");
  if (ctx) {
    // Position warning in center
    const warningX = (width - warningSize) / 2;
    const warningY = (height - warningSize) / 2;

    // Add a subtle shadow for depth
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = pixelSize;
    ctx.shadowOffsetX = pixelSize / 2;
    ctx.shadowOffsetY = pixelSize / 2;

    ctx.drawImage(warningCanvas, warningX, warningY, warningSize, warningSize);
  }

  return redPixelatedCanvas.toDataURL("image/png");
}

/**
 * Creates an error overlay from an image URL
 *
 * Loads the image from URL and generates the error overlay asynchronously.
 *
 * @param imageUrl - URL of the source image
 * @param width - Target width for the error overlay
 * @param height - Target height for the error overlay
 * @param pixelSize - Size of pixel blocks (default: 20)
 * @returns Promise resolving to data URL of the error overlay, or undefined on failure
 */
export async function createErrorOverlayFromUrl(
  imageUrl: string,
  width: number,
  height: number,
  pixelSize: number = DEFAULT_PIXEL_SIZE,
): Promise<string | undefined> {
  try {
    const img = new window.Image();
    img.crossOrigin = "anonymous";

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = imageUrl;
    });

    return createErrorOverlay(img, width, height, pixelSize);
  } catch (_error) {
    return undefined;
  }
}

/**
 * Detects if an error message indicates a content validation failure
 *
 * @param errorMessage - Error message from API or generation system
 * @returns true if the error is related to content validation/moderation
 */
export function isContentValidationError(errorMessage: string): boolean {
  const message = errorMessage.toLowerCase();
  return (
    message.includes("error validating the input") ||
    message.includes("content flagged") ||
    message.includes("content checker") ||
    message.includes("content could not be processed")
  );
}
