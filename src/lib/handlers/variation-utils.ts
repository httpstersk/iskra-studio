/**
 * Shared utilities for variation handlers (image and video)
 */

import type { PlacedImage } from "@/types/canvas";

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
 * Converts an image source to a Blob
 */
export async function imageToBlob(imageSrc: string): Promise<Blob> {
  const img = new window.Image();
  img.crossOrigin = "anonymous";
  img.src = imageSrc;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
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
          reject(new Error("Failed to create blob"));
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
export async function uploadToConvex(
  blob: Blob,
  toast: ToastFunction
): Promise<string> {
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
    return result.url;
  } catch (error: unknown) {
    const isRateLimit =
      (error as { status?: number; message?: string }).status === 429 ||
      (error as { message?: string }).message?.includes("429") ||
      (error as { message?: string }).message?.includes("rate limit");

    if (isRateLimit) {
      toast({
        title: "Rate limit exceeded",
        description: "Please try again later.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
    throw error;
  }
}

/**
 * Ensures an image is stored in Convex, uploading if necessary
 * Returns the Convex URL (either existing or newly uploaded)
 */
export async function ensureImageInConvex(
  imageSrc: string,
  toast: ToastFunction
): Promise<string> {
  // If already in Convex, return as-is
  if (isConvexStorageUrl(imageSrc)) {
    return imageSrc;
  }

  // Otherwise, convert and upload
  const blob = await imageToBlob(imageSrc);
  return await uploadToConvex(blob, toast);
}

/**
 * Validates that exactly one image is selected
 */
export function validateSingleImageSelection(
  images: PlacedImage[],
  selectedIds: string[],
  toast: ToastFunction
): PlacedImage | null {
  if (selectedIds.length !== 1) {
    toast({
      title: "Select one image",
      description: "Please select exactly one image to generate variations",
      variant: "destructive",
    });
    return null;
  }

  const selectedImage = images.find((img) => img.id === selectedIds[0]);
  if (!selectedImage) {
    toast({
      title: "Image not found",
      description: "The selected image could not be found",
      variant: "destructive",
    });
    return null;
  }

  return selectedImage;
}
