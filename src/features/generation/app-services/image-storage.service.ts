/**
 * Image Storage Service
 * Handles image upload, conversion, and storage operations
 *
 * @module features/generation/app-services/image-storage
 */

import { logger } from "@/shared/logging/logger";
import { StorageError, ValidationError } from "@/shared/errors";

const serviceLogger = logger.child({ service: "image-storage" });

export function isConvexStorageUrl(url: string): boolean {
  return (
    url.includes("/api/storage/") ||
    url.includes(".convex.cloud") ||
    url.includes(".convex.site")
  );
}

export function extractSignedUrlFromProxy(proxyUrl: string): string | null {
  try {
    if (!proxyUrl || typeof proxyUrl !== "string" || !proxyUrl.trim()) {
      return null;
    }

    const queryStart = proxyUrl.indexOf("?");
    if (queryStart === -1) return null;

    const params = new URLSearchParams(proxyUrl.substring(queryStart + 1));
    const signedUrl = params.get("url");

    if (!signedUrl || !signedUrl.trim()) return null;

    const trimmedUrl = signedUrl.trim();
    if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
      return null;
    }

    return trimmedUrl;
  } catch (error) {
    serviceLogger.warn("Failed to extract signed URL", { proxyUrl });
    return null;
  }
}

export async function imageToBlob(imageSrc: string): Promise<Blob> {
  try {
    serviceLogger.debug("Converting image to blob", { imageSrc });

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new StorageError("Failed to load image"));
    });

    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new StorageError("Failed to get canvas context");

    ctx.drawImage(img, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new StorageError("Failed to create blob")),
        "image/png",
        0.95,
      );
    });

    serviceLogger.debug("Image converted to blob", { blobSize: blob.size });
    return blob;
  } catch (error) {
    if (error instanceof StorageError) throw error;
    
    serviceLogger.error("Image to blob conversion failed", error as Error);
    throw new StorageError(
      error instanceof Error ? error.message : "Unknown conversion error",
    );
  }
}

export async function uploadToConvex(blob: Blob): Promise<string> {
  try {
    serviceLogger.info("Uploading blob to Convex", { blobSize: blob.size });

    const formData = new FormData();
    formData.append("file", blob, "image.png");

    const response = await fetch("/api/convex/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);

      if (response.status === 429) {
        throw new StorageError("Rate limit exceeded. Please try again later.", {
          statusCode: 429,
        });
      }

      throw new StorageError(
        errorData?.message || `Upload failed with status ${response.status}`,
        { statusCode: response.status },
      );
    }

    const result = await response.json();
    serviceLogger.info("Upload successful");
    
    return result.url;
  } catch (error) {
    if (error instanceof StorageError) throw error;
    
    serviceLogger.error("Upload to Convex failed", error as Error);
    throw new StorageError(
      error instanceof Error ? error.message : "Unknown upload error",
    );
  }
}

export async function ensureImageInConvex(imageSrc: string): Promise<string> {
  if (isConvexStorageUrl(imageSrc)) {
    serviceLogger.debug("Image already in Convex");
    return imageSrc;
  }

  serviceLogger.info("Uploading image to Convex");
  const blob = await imageToBlob(imageSrc);
  return await uploadToConvex(blob);
}

export function toSignedUrl(imageUrl: string): string {
  if (!imageUrl || typeof imageUrl !== "string") {
    throw new ValidationError("Invalid image URL: empty or non-string");
  }

  const trimmedUrl = imageUrl.trim();
  if (!trimmedUrl) {
    throw new ValidationError("Invalid image URL: empty after trimming");
  }

  const isProxyUrl = trimmedUrl.includes("/api/storage/proxy?");

  if (isProxyUrl) {
    const signedUrl = extractSignedUrlFromProxy(trimmedUrl);
    if (!signedUrl) {
      throw new ValidationError("Failed to extract signed URL from proxy URL");
    }
    return signedUrl;
  }

  if (trimmedUrl.startsWith("data:")) {
    throw new ValidationError(
      "Data URLs are not supported for server-side processing",
    );
  }

  if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
    throw new ValidationError("Invalid image URL format: must be a full URL or proxy URL");
  }

  try {
    new URL(trimmedUrl);
  } catch {
    throw new ValidationError("Malformed URL structure");
  }

  return trimmedUrl;
}
