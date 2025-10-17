/**
 * Client-side thumbnail generation for images.
 * 
 * Uses Canvas API to generate optimized thumbnails (400x400 WebP)
 * from full-size images. Runs on the client to avoid server-side
 * dependencies while maintaining bandwidth optimization.
 */

/**
 * Generates a thumbnail blob from an image blob.
 * 
 * Creates a 400x400px WebP thumbnail while maintaining aspect ratio.
 * Falls back gracefully if thumbnail generation fails.
 * 
 * @param imageBlob - The full-size image blob
 * @param maxSize - Maximum dimension (default: 400px)
 * @returns Thumbnail blob, or undefined if generation fails
 * 
 * @example
 * ```ts
 * const imageBlob = new Blob([imageData], { type: 'image/jpeg' });
 * const thumbnailBlob = await generateThumbnail(imageBlob);
 * 
 * if (thumbnailBlob) {
 *   formData.append('thumbnail', thumbnailBlob);
 * }
 * ```
 */
export async function generateThumbnail(
  imageBlob: Blob,
  maxSize: number = 400
): Promise<Blob | undefined> {
  try {
    console.log("[Thumbnail] Starting generation, blob type:", imageBlob.type, "size:", imageBlob.size);
    
    // Read the image as a data URL
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => {
        console.error("[Thumbnail] FileReader error:", error);
        reject(error);
      };
      reader.readAsDataURL(imageBlob);
    });

    console.log("[Thumbnail] Data URL created, length:", dataUrl.length);

    // Create an image element to get dimensions
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        console.log("[Thumbnail] Image loaded, dimensions:", image.width, "x", image.height);
        resolve(image);
      };
      image.onerror = (error) => {
        console.error("[Thumbnail] Image load error:", error);
        reject(new Error("Failed to load image"));
      };
      image.src = dataUrl;
    });

    // Calculate new dimensions maintaining aspect ratio
    let width = img.width;
    let height = img.height;

    if (width > height) {
      if (width > maxSize) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      }
    } else {
      if (height > maxSize) {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
      }
    }

    // Create canvas and draw resized image
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    ctx.drawImage(img, 0, 0, width, height);

    // Convert canvas to blob (WebP with quality 0.8)
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", 0.8);
    });

    if (!blob) {
      console.error("[Thumbnail] Failed to create thumbnail blob from canvas");
      throw new Error("Failed to create thumbnail blob");
    }

    console.log("[Thumbnail] Successfully generated thumbnail, size:", blob.size, "type:", blob.type);
    return blob;
  } catch (error) {
    console.error("[Thumbnail] Generation failed:", error);
    // Return undefined to allow upload to continue without thumbnail
    return undefined;
  }
}
