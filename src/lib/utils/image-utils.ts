/**
 * Shared image processing utilities.
 *
 * Common functions for working with images, blobs, and canvas operations
 * that are reused across image compression and thumbnail generation.
 */

const ERROR_MESSAGES = {
  CANVAS_CONTEXT_FAILED: "Failed to get canvas context",
  IMAGE_LOAD_FAILED: "Failed to load image",
} as const;

/**
 * Reads a blob and converts it to a data URL.
 *
 * @param blob - The blob to convert
 * @returns Promise resolving to the data URL string
 */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Loads an image from a data URL.
 *
 * @param dataUrl - The data URL to load
 * @returns Promise resolving to the loaded HTMLImageElement
 */
export async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(ERROR_MESSAGES.IMAGE_LOAD_FAILED));
    image.src = dataUrl;
  });
}

/**
 * Gets a 2D rendering context from a canvas element.
 *
 * @param canvas - The canvas element
 * @returns The 2D rendering context
 * @throws Error if context cannot be obtained
 */
export function getCanvasContext(
  canvas: HTMLCanvasElement
): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error(ERROR_MESSAGES.CANVAS_CONTEXT_FAILED);
  }
  return ctx;
}

/**
 * Converts a canvas to a blob.
 *
 * @param canvas - The canvas element to convert
 * @param format - The image format (e.g., 'image/webp', 'image/jpeg')
 * @param quality - The image quality (0.0 to 1.0)
 * @returns Promise resolving to the blob
 */
export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: string,
  quality: number
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error(`Failed to create ${format} blob`));
          return;
        }
        resolve(blob);
      },
      format,
      quality
    );
  });
}
