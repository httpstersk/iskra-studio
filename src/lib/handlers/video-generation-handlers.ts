/**
 * Video generation handlers
 * Handles image-to-video operations
 */

import { CANVAS_DIMENSIONS, VIDEO_DEFAULTS } from "@/constants/canvas";
import type {
  PlacedImage,
  PlacedVideo,
  VideoGenerationSettings,
} from "@/types/canvas";
import { convertImageToVideo } from "@/utils/video-utils";
import { downloadAndReupload } from "./asset-download-handler";

/**
 * Creates a unique generation ID with prefix
 */
export function createGenerationId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Uploads media if it's a data URL or blob URL
 * 
 * @param url - URL of the media to upload
 * @param userId - User ID for Convex storage
 * @returns URL of the uploaded media
 */
export async function uploadMediaIfNeeded(
  url: string,
  userId?: string,
): Promise<string> {
  if (url.startsWith("data:") || url.startsWith("blob:")) {
    if (!userId) {
      throw new Error("User ID required for upload");
    }

    const blob = await (await fetch(url)).blob();
    const mimeType = blob.type || "image/png";
    const type = mimeType.startsWith("video/") ? "video" : "image";
    
    const result = await downloadAndReupload(url, {
      userId,
      type,
      mimeType,
      metadata: {},
    });
    
    return result.url;
  }
  return url;
}

/**
 * Creates a video generation configuration for image-to-video conversion
 */
export function createImageToVideoConfig(
  imageUrl: string,
  settings: VideoGenerationSettings,
  sourceImageId: string,
) {
  const config = {
    aspectRatio: settings.aspectRatio || "auto",
    cameraFixed: settings.cameraFixed,
    duration: settings.duration || VIDEO_DEFAULTS.DURATION,
    imageUrl,
    modelId: settings.modelId || VIDEO_DEFAULTS.MODEL_ID,
    prompt: settings.prompt || "",
    resolution: settings.resolution || VIDEO_DEFAULTS.RESOLUTION,
    seed: settings.seed,
    sourceImageId,
  };

  console.log("createImageToVideoConfig - Creating config:", {
    inputSettings: settings,
    outputConfig: config,
  });

  return config;
}

/**
 * Handles completion of video generation
 */
export function handleVideoCompletion(
  _videoId: string,
  videoUrl: string,
  duration: number,
  generation: { sourceImageId?: string } | null,
  images: PlacedImage[],
  selectedImageForVideo: string | null,
): { newVideo: PlacedVideo | null; sourceType: "image" | null } {
  const sourceImageId = generation?.sourceImageId || selectedImageForVideo;

  if (sourceImageId) {
    const image = images.find((img) => img.id === sourceImageId);
    if (image) {
      const video = convertImageToVideo(image, videoUrl, duration, false);
      video.x = image.x + image.width + CANVAS_DIMENSIONS.IMAGE_SPACING;
      video.y = image.y;
      return {
        newVideo: { ...video, isVideo: true as const },
        sourceType: "image",
      };
    }
  }

  return { newVideo: null, sourceType: null };
}

/**
 * Dismisses a toast by clicking its close button
 */
export function dismissToast(toastId: string): void {
  const toastElement = document.querySelector(`[data-toast-id="${toastId}"]`);
  if (toastElement) {
    const closeButton = toastElement.querySelector("[data-radix-toast-close]");
    if (closeButton instanceof HTMLElement) {
      closeButton.click();
    }
  }
}
