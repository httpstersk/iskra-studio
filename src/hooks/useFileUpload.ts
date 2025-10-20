import { createStorageService } from "@/lib/storage";
import { compressImage } from "@/lib/utils/compress-image";
import type { PlacedImage } from "@/types/canvas";
import {
  cropImageToAspectRatio,
  determineAspectRatio,
} from "@/utils/image-crop-utils";
import { useCallback } from "react";
import type { Viewport } from "./useCanvasState";

export function useFileUpload(
  setImages: (fn: (prev: PlacedImage[]) => PlacedImage[]) => void,
  viewport: Viewport,
  canvasSize: { width: number; height: number },
  userId?: string,
  toast?: (props: {
    title: string;
    description?: string;
    variant?: "default" | "destructive";
  }) => void
) {
  const handleFileUpload = useCallback(
    (files: FileList | null, position?: { x: number; y: number }) => {
      if (!files) return;

      Array.from(files).forEach(async (file, index) => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = async (e) => {
            const id = `img-${Date.now()}-${Math.random()}`;
            const img = new window.Image();
            img.crossOrigin = "anonymous";
            img.onload = async () => {
              // Determine best aspect ratio and crop the image
              const targetAspectRatio = determineAspectRatio(
                img.naturalWidth,
                img.naturalHeight
              );

              // Crop image to 16:9 or 9:16
              const croppedImageSrc = await cropImageToAspectRatio(
                img,
                targetAspectRatio
              );

              // Create a new image element to get the cropped dimensions
              const croppedImg = new window.Image();
              croppedImg.onload = async () => {
                // Use naturalWidth/naturalHeight to avoid detached element issues
                const naturalWidth =
                  croppedImg.naturalWidth || croppedImg.width;
                const naturalHeight =
                  croppedImg.naturalHeight || croppedImg.height;

                // Fall back to a safe default if both dimensions are zero
                const safeWidth = naturalWidth || 512;
                const safeHeight = naturalHeight || 512;

                const aspectRatio = safeWidth / safeHeight;
                const maxSize = 300;
                let width = maxSize;
                let height = maxSize / aspectRatio;

                if (height > maxSize) {
                  height = maxSize;
                  width = maxSize * aspectRatio;
                }

                let x, y;
                if (position) {
                  x = (position.x - viewport.x) / viewport.scale - width / 2;
                  y = (position.y - viewport.y) / viewport.scale - height / 2;
                } else {
                  const viewportCenterX =
                    (canvasSize.width / 2 - viewport.x) / viewport.scale;
                  const viewportCenterY =
                    (canvasSize.height / 2 - viewport.y) / viewport.scale;
                  x = viewportCenterX - width / 2;
                  y = viewportCenterY - height / 2;
                }

                if (index > 0) {
                  x += index * 20;
                  y += index * 20;
                }

                // Optimistic update: Add image immediately with local data URL
                setImages((prev) => [
                  ...prev,
                  {
                    id,
                    src: croppedImageSrc,
                    x,
                    y,
                    width,
                    height,
                    rotation: 0,
                    naturalWidth,
                    naturalHeight,
                  },
                ]);

                // Upload to Convex storage in the background if userId is provided
                if (userId) {
                  console.log(
                    "[Upload] Starting background upload for image:",
                    id
                  );
                  (async () => {
                    try {
                      // Convert cropped image data URL to blob
                      const response = await fetch(croppedImageSrc);
                      const blob = await response.blob();

                      console.log("[Upload] Blob created, size:", blob.size);

                      // Compress image to JPEG with max 1920x1080 resolution
                      const compressedBlob = await compressImage(blob);
                      console.log(
                        "[Upload] Image compressed, original size:",
                        blob.size,
                        "compressed size:",
                        compressedBlob.size
                      );

                      // Upload to Convex storage
                      const storage = createStorageService();
                      const uploadResult = await storage.upload(
                        compressedBlob,
                        {
                          userId,
                          type: "image",
                          mimeType: "image/jpeg",
                          metadata: {
                            model: "user-upload",
                            prompt: file.name,
                            width: naturalWidth,
                            height: naturalHeight,
                          },
                        }
                      );

                      console.log(
                        "[Upload] Upload successful:",
                        uploadResult.url,
                        "assetId:",
                        uploadResult.assetId
                      );

                      // Update the image with the proxy URL, asset reference, and thumbnail
                      setImages((prev) =>
                        prev.map((img) =>
                          img.id === id
                            ? {
                                ...img,
                                src: uploadResult.url,
                                thumbnailSrc: uploadResult.thumbnailProxyUrl,
                                assetId: uploadResult.assetId,
                                assetSyncedAt: Date.now(),
                              }
                            : img
                        )
                      );
                    } catch (error) {
                      console.error("Failed to upload image to Convex:", error);
                      if (toast) {
                        toast({
                          title: "Upload failed",
                          description: "Image will be stored locally only",
                          variant: "destructive",
                        });
                      }
                      // Keep using the data URL if upload fails
                    }
                  })();
                } else {
                  console.log("[Upload] Skipping upload - no userId provided");
                }
              };
              croppedImg.src = croppedImageSrc;
            };
            img.src = e.target?.result as string;
          };

          reader.readAsDataURL(file);
        }
      });
    },
    [setImages, viewport, canvasSize, userId, toast]
  );

  const handleDrop = useCallback(
    (
      e: React.DragEvent,
      stageRef: React.RefObject<{ container(): HTMLElement }>
    ) => {
      e.preventDefault();

      const stage = stageRef.current;
      if (stage) {
        const container = stage.container();
        const rect = container.getBoundingClientRect();
        const dropPosition = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };
        handleFileUpload(e.dataTransfer.files, dropPosition);
      } else {
        handleFileUpload(e.dataTransfer.files);
      }
    },
    [handleFileUpload]
  );

  return {
    handleFileUpload,
    handleDrop,
  };
}
