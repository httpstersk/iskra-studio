/**
 * Shared utilities for variation handlers (image and video)
 * Uses errors-as-values pattern with @safe-std/error
 *
 * @module lib/handlers/variation-utils
 */

import type { PlacedImage } from "@/types/canvas";
import { showError } from "@/lib/toast";
import { tryPromise, isErr, getErrorMessage } from "@/lib/errors/safe-errors";

/**
 * Checks if a URL is a Convex storage URL
 */
export function isConvexStorageUrl(url: string): boolean {
  return (
    url.includes("/api/storage/") ||
    url.includes(".convex.cloud") ||
    url.includes(".convex.site")
  );
}

/**
 * Extracts the signed URL from a proxy URL
 * Proxy URLs have format: /api/storage/proxy?url=<encoded-signed-url>
 */
export function extractSignedUrlFromProxy(proxyUrl: string): string | null {
  try {
    // Validate input
    if (!proxyUrl || typeof proxyUrl !== "string" || !proxyUrl.trim()) {
      return null;
    }

    // Extract query string from the URL (works for both relative and absolute URLs)
    const queryStart = proxyUrl.indexOf("?");
    if (queryStart === -1) {
      return null;
    }

    // URLSearchParams handles URL decoding automatically
    const queryString = proxyUrl.substring(queryStart + 1);
    const params = new URLSearchParams(queryString);
    const signedUrl = params.get("url");

    if (!signedUrl || !signedUrl.trim()) {
      return null;
    }

    // Validate that the extracted URL is actually a full URL
    const trimmedUrl = signedUrl.trim();
    if (
      !trimmedUrl.startsWith("http://") &&
      !trimmedUrl.startsWith("https://")
    ) {
      return null;
    }

    return trimmedUrl;
  } catch (_error) {
    return null;
  }
}

/**
 * Converts an image source to a Blob
 * Returns errors as values instead of throwing
 */
export async function imageToBlob(imageSrc: string): Promise<Blob | Error> {
  const img = new window.Image();
  img.crossOrigin = "anonymous";
  img.src = imageSrc;

  const loadResult = await tryPromise(
    new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = (_error) => {
        reject(new Error(`Failed to load image: ${imageSrc.substring(0, 100)}`));
      };
    })
  );

  if (isErr(loadResult)) {
    return new Error(`Image load failed: ${getErrorMessage(loadResult)}`);
  }

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return new Error("Failed to get canvas context");
  }

  ctx.drawImage(img, 0, 0);

  const blobResult = await tryPromise(
    new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create blob from canvas"));
          }
        },
        "image/png",
        0.95,
      );
    })
  );

  if (isErr(blobResult)) {
    return new Error(`Blob creation failed: ${getErrorMessage(blobResult)}`);
  }

  return blobResult;
}

/**
 * Uploads a blob to Convex storage
 * Returns errors as values instead of throwing
 */
export async function uploadToConvex(blob: Blob): Promise<string | Error> {
  const formData = new FormData();
  formData.append("file", blob, "image.png");

  const fetchResult = await tryPromise(
    fetch("/api/convex/upload", {
      method: "POST",
      body: formData,
    })
  );

  if (isErr(fetchResult)) {
    const errorMsg = `Upload fetch failed: ${getErrorMessage(fetchResult)}`;
    showError("Upload failed", errorMsg);
    return new Error(errorMsg);
  }

  const response = fetchResult;

  if (!response.ok) {
    const errorResult = await tryPromise(response.json());
    const errorMsg = !isErr(errorResult) && errorResult?.message
      ? errorResult.message
      : `Upload failed with status ${response.status}`;

    // Check for rate limit
    const isRateLimit =
      response.status === 429 ||
      errorMsg.includes("429") ||
      errorMsg.includes("rate limit");

    if (isRateLimit) {
      showError("Rate limit exceeded", "Please try again later.");
    } else {
      showError("Upload failed", errorMsg);
    }

    return new Error(errorMsg);
  }

  const jsonResult = await tryPromise(response.json());

  if (isErr(jsonResult)) {
    const errorMsg = `Upload response parse failed: ${getErrorMessage(jsonResult)}`;
    showError("Upload failed", errorMsg);
    return new Error(errorMsg);
  }

  // Return proxy URL for client-side display (includes thumbnails)
  return jsonResult.url;
}

/**
 * Ensures an image is stored in Convex, uploading if necessary
 * Returns a URL (either proxy or full, depending on input)
 * Returns errors as values instead of throwing
 */
export async function ensureImageInConvex(imageSrc: string): Promise<string | Error> {
  // If already in Convex, return as-is (could be proxy or signed URL)
  if (isConvexStorageUrl(imageSrc)) {
    return imageSrc;
  }

  // Otherwise, convert and upload
  const blob = await imageToBlob(imageSrc);
  if (blob instanceof Error) {
    return new Error(`Image conversion failed: ${blob.message}`);
  }

  const uploadResult = await uploadToConvex(blob);
  if (uploadResult instanceof Error) {
    return new Error(`Upload failed: ${uploadResult.message}`);
  }

  return uploadResult;
}

/**
 * Converts a proxy URL or Convex URL to a signed URL suitable for tRPC
 * Extracts signed URL from proxy URLs, returns full URLs as-is
 * Returns errors as values instead of throwing
 */
export function toSignedUrl(imageUrl: string): string | Error {
  // Validate input
  if (!imageUrl || typeof imageUrl !== "string") {
    return new Error("Invalid image URL: empty or non-string");
  }

  const trimmedUrl = imageUrl.trim();
  if (!trimmedUrl) {
    return new Error("Invalid image URL: empty after trimming");
  }

  // Check if it's a proxy URL (more robust check)
  const isProxyUrl = trimmedUrl.includes("/api/storage/proxy?");

  if (isProxyUrl) {
    const signedUrl = extractSignedUrlFromProxy(trimmedUrl);

    if (!signedUrl) {
      return new Error(
        `Failed to extract signed URL from proxy URL: ${trimmedUrl.substring(0, 100)}`,
      );
    }
    return signedUrl;
  }

  // Handle data URLs (valid but not suitable for server-side APIs)
  if (trimmedUrl.startsWith("data:")) {
    return new Error(
      "Data URLs are not supported for server-side processing. Please upload the image first.",
    );
  }

  // If it's a relative URL that's not a proxy, it's invalid
  if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
    return new Error(
      `Invalid image URL format: must be a full URL or proxy URL, got: ${trimmedUrl.substring(0, 100)}`,
    );
  }

  // Validate URL structure
  try {
    new URL(trimmedUrl);
  } catch {
    return new Error(`Malformed URL structure: ${trimmedUrl.substring(0, 100)}`);
  }

  // Otherwise return as-is (already a full URL)
  return trimmedUrl;
}

/**
 * Validates that 1 or 2 images are selected
 */
export function validateImageSelection(
  images: PlacedImage[],
  selectedIds: string[],
): PlacedImage[] | null {
  if (selectedIds.length === 0 || selectedIds.length > 2) {
    showError(
      "Select 1 or 2 images",
      "Please select 1 or 2 images to generate variations",
    );
    return null;
  }

  const selectedImages = selectedIds
    .map((id) => images.find((img) => img.id === id))
    .filter((img): img is PlacedImage => !!img);

  if (selectedImages.length !== selectedIds.length) {
    showError("Image not found", "One or more selected images could not be found");
    return null;
  }

  return selectedImages;
}

/**
 * Validates that exactly 1 image is selected
 */
export function validateSingleImageSelection(
  images: PlacedImage[],
  selectedIds: string[],
): PlacedImage | null {
  if (selectedIds.length !== 1) {
    showError(
      "Select 1 image",
      "Please select exactly 1 image to generate variations",
    );
    return null;
  }

  const selectedImage = images.find((img) => img.id === selectedIds[0]);

  if (!selectedImage) {
    showError("Image not found", "The selected image could not be found");
    return null;
  }

  return selectedImage;
}
