/**
 * Determines the best aspect ratio (16:9 or 9:16) for an image based on its dimensions
 * @param width - Image width
 * @param height - Image height
 * @returns "landscape_16_9" or "portrait_16_9"
 */
export function determineAspectRatio(
  width: number,
  height: number
): "landscape_16_9" | "portrait_16_9" {
  const aspectRatio = width / height;
  
  // If aspect ratio is greater than 1, it's landscape (wider than tall)
  // If aspect ratio is less than 1, it's portrait (taller than wide)
  // The threshold is 1.0 (square)
  return aspectRatio >= 1 ? "landscape_16_9" : "portrait_16_9";
}

/**
 * Gets the optimal dimensions for image generation based on source dimensions
 * Uses 4K resolution (3840x2160 for landscape, 2160x3840 for portrait)
 * @param width - Image width
 * @param height - Image height
 * @returns Dimensions object { width, height }
 */
export function getOptimalImageDimensions(
  width: number,
  height: number
): { width: number; height: number } {
  const aspectRatioMode = determineAspectRatio(width, height);
  
  // Use 4K dimensions (3840x2160 for 16:9, 2160x3840 for 9:16)
  return aspectRatioMode === "landscape_16_9"
    ? { width: 3840, height: 2160 }
    : { width: 2160, height: 3840 };
}

/**
 * Calculates crop dimensions to fit an image to 16:9 or 9:16 aspect ratio
 * @param originalWidth - Original image width
 * @param originalHeight - Original image height
 * @param targetAspectRatio - Target aspect ratio (16:9 or 9:16)
 * @returns Crop dimensions { width, height, x, y }
 */
export function calculateCropDimensions(
  originalWidth: number,
  originalHeight: number,
  targetAspectRatio: "16:9" | "9:16"
): { width: number; height: number; x: number; y: number } {
  const targetRatio = targetAspectRatio === "16:9" ? 16 / 9 : 9 / 16;
  const currentRatio = originalWidth / originalHeight;

  let cropWidth: number;
  let cropHeight: number;
  let cropX: number;
  let cropY: number;

  if (currentRatio > targetRatio) {
    // Image is wider than target - crop width
    cropHeight = originalHeight;
    cropWidth = originalHeight * targetRatio;
    cropX = (originalWidth - cropWidth) / 2;
    cropY = 0;
  } else {
    // Image is taller than target - crop height
    cropWidth = originalWidth;
    cropHeight = originalWidth / targetRatio;
    cropX = 0;
    cropY = (originalHeight - cropHeight) / 2;
  }

  return {
    width: Math.round(cropWidth),
    height: Math.round(cropHeight),
    x: Math.round(cropX),
    y: Math.round(cropY),
  };
}

/**
 * Crops an image to 16:9 or 9:16 aspect ratio
 * @param imageElement - HTMLImageElement to crop
 * @param targetAspectRatio - Target aspect ratio determined by determineAspectRatio
 * @returns Cropped image as data URL
 */
export async function cropImageToAspectRatio(
  imageElement: HTMLImageElement,
  targetAspectRatio: "landscape_16_9" | "portrait_16_9"
): Promise<string> {
  const aspectRatio = targetAspectRatio === "landscape_16_9" ? "16:9" : "9:16";
  const cropDimensions = calculateCropDimensions(
    imageElement.naturalWidth,
    imageElement.naturalHeight,
    aspectRatio
  );

  // Create canvas with crop dimensions
  const canvas = document.createElement("canvas");
  canvas.width = cropDimensions.width;
  canvas.height = cropDimensions.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Draw the cropped portion of the image
  ctx.drawImage(
    imageElement,
    cropDimensions.x,
    cropDimensions.y,
    cropDimensions.width,
    cropDimensions.height,
    0,
    0,
    cropDimensions.width,
    cropDimensions.height
  );

  // Convert to data URL
  return canvas.toDataURL("image/png");
}
