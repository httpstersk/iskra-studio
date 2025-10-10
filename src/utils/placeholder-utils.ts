/**
 * Utility functions for creating placeholder images and loading states
 */

/**
 * Creates a blurred version of an image element for loading placeholders
 * @param imgElement - HTMLImageElement to blur
 * @param blurRadius - Blur radius (default: 12)
 * @returns Data URL for the blurred image
 */
export function createPixelatedImage(
  imgElement: HTMLImageElement,
  blurRadius: number = 12,
): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    return "data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";
  }

  // Set canvas to the image dimensions
  canvas.width = imgElement.naturalWidth || imgElement.width;
  canvas.height = imgElement.naturalHeight || imgElement.height;

  // Draw the original image
  ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height);

  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Create a copy for the blurred result
  const blurredData = new Uint8ClampedArray(data);

  // Apply box blur effect (fast approximation of gaussian blur)
  const kernelSize = Math.max(1, Math.floor(blurRadius / 2));

  // Horizontal pass
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      let count = 0;

      // Sample pixels in horizontal kernel
      for (let kx = -kernelSize; kx <= kernelSize; kx++) {
        const sampleX = Math.min(Math.max(x + kx, 0), canvas.width - 1);
        const idx = (y * canvas.width + sampleX) * 4;

        r += data[idx];
        g += data[idx + 1];
        b += data[idx + 2];
        a += data[idx + 3];
        count++;
      }

      const outIdx = (y * canvas.width + x) * 4;
      blurredData[outIdx] = r / count;
      blurredData[outIdx + 1] = g / count;
      blurredData[outIdx + 2] = b / count;
      blurredData[outIdx + 3] = a / count;
    }
  }

  // Copy horizontal blur result back
  data.set(blurredData);

  // Vertical pass
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      let count = 0;

      // Sample pixels in vertical kernel
      for (let ky = -kernelSize; ky <= kernelSize; ky++) {
        const sampleY = Math.min(Math.max(y + ky, 0), canvas.height - 1);
        const idx = (sampleY * canvas.width + x) * 4;

        r += data[idx];
        g += data[idx + 1];
        b += data[idx + 2];
        a += data[idx + 3];
        count++;
      }

      const outIdx = (y * canvas.width + x) * 4;
      blurredData[outIdx] = r / count;
      blurredData[outIdx + 1] = g / count;
      blurredData[outIdx + 2] = b / count;
      blurredData[outIdx + 3] = a / count;
    }
  }

  // Create new image data with blurred result
  const blurredImageData = new ImageData(
    blurredData,
    canvas.width,
    canvas.height,
  );

  // Put the blurred data back
  ctx.putImageData(blurredImageData, 0, 0);

  // Add a subtle overlay to indicate it's a loading state
  ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  return canvas.toDataURL();
}

/**
 * Creates a loading placeholder data URL with a gradient shimmer effect
 * @param width - Width of the placeholder
 * @param height - Height of the placeholder
 * @returns Data URL for the placeholder image
 */
export function createLoadingPlaceholder(
  width: number,
  height: number,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    // Fallback to a simple gray pixel
    return "data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";
  }

  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#e5e7eb");
  gradient.addColorStop(0.5, "#f3f4f6");
  gradient.addColorStop(1, "#e5e7eb");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add border
  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, width, height);

  // Add centered loading icon/text
  ctx.fillStyle = "#9ca3af";
  ctx.font = `${Math.min(width, height) / 10}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Loading...", width / 2, height / 2);

  return canvas.toDataURL();
}
