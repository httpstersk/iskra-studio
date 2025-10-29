/**
 * Shared utilities for variation handlers (image and video)
 */

import type { PlacedImage } from "@/types/canvas";
import { showError } from "@/lib/toast";

interface ToastFunction {
  (props: {
    title: string;
    description?: string;
    variant?: "default" | "destructive";
  }): void;
}

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
  } catch (error) {
    return null;
  }
}

/**
 * Converts an image source to a Blob
 */
export async function imageToBlob(imageSrc: string): Promise<Blob> {
  const img = new window.Image();
  img.crossOrigin = "anonymous";
  img.src = imageSrc;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = (error) => {
      reject(new Error(`Failed to load image: ${imageSrc.substring(0, 100)}`));
    };
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  ctx.drawImage(img, 0, 0);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob from canvas"));
        }
      },
      "image/png",
      0.95
    );
  });
}

/**
 * Uploads a blob to Convex storage
 */
export async function uploadToConvex(blob: Blob): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("file", blob, "image.png");

    const response = await fetch("/api/convex/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message || `Upload failed with status ${response.status}`
      );
    }

    const result = await response.json();
    // Return proxy URL for client-side display (includes thumbnails)
    return result.url;
  } catch (error: unknown) {
    const isRateLimit =
      (error as { status?: number; message?: string }).status === 429 ||
      (error as { message?: string }).message?.includes("429") ||
      (error as { message?: string }).message?.includes("rate limit");

    if (isRateLimit) {
      showError("Rate limit exceeded", "Please try again later.");
    } else {
      showError(
        "Upload failed",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
    throw error;
  }
}

/**
 * Ensures an image is stored in Convex, uploading if necessary
 * Returns a URL (either proxy or full, depending on input)
 */
export async function ensureImageInConvex(imageSrc: string): Promise<string> {
  // If already in Convex, return as-is (could be proxy or signed URL)
  if (isConvexStorageUrl(imageSrc)) {
    return imageSrc;
  }

  // Otherwise, convert and upload
  const blob = await imageToBlob(imageSrc);
  return await uploadToConvex(blob);
}

/**
 * Converts a proxy URL or Convex URL to a signed URL suitable for tRPC
 * Extracts signed URL from proxy URLs, returns full URLs as-is
 */
export function toSignedUrl(imageUrl: string): string {
  // Validate input
  if (!imageUrl || typeof imageUrl !== "string") {
    throw new Error("Invalid image URL: empty or non-string");
  }

  const trimmedUrl = imageUrl.trim();
  if (!trimmedUrl) {
    throw new Error("Invalid image URL: empty after trimming");
  }

  // Check if it's a proxy URL (more robust check)
  const isProxyUrl = trimmedUrl.includes("/api/storage/proxy?");

  if (isProxyUrl) {
    const signedUrl = extractSignedUrlFromProxy(trimmedUrl);

    if (!signedUrl) {
      throw new Error(
        `Failed to extract signed URL from proxy URL: ${trimmedUrl.substring(0, 100)}`
      );
    }
    return signedUrl;
  }

  // Handle data URLs (valid but not suitable for server-side APIs)
  if (trimmedUrl.startsWith("data:")) {
    throw new Error(
      "Data URLs are not supported for server-side processing. Please upload the image first."
    );
  }

  // If it's a relative URL that's not a proxy, it's invalid
  if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
    throw new Error(
      `Invalid image URL format: must be a full URL or proxy URL, got: ${trimmedUrl.substring(0, 100)}`
    );
  }

  // Validate URL structure
  try {
    new URL(trimmedUrl);
  } catch {
    throw new Error(`Malformed URL structure: ${trimmedUrl.substring(0, 100)}`);
  }

  // Otherwise return as-is (already a full URL)
  return trimmedUrl;
}

/**
 * Validates that exactly one image is selected
 */
export function validateSingleImageSelection(
  images: PlacedImage[],
  selectedIds: string[]
): PlacedImage | null {
  if (selectedIds.length !== 1) {
    showError(
      "Select one image",
      "Please select exactly one image to generate variations"
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
