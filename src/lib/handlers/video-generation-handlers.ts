/**
 * Video generation handlers
 * Handles image-to-video, video-to-video, video extension, and background removal operations
 */

import type { PlacedImage, PlacedVideo, VideoGenerationSettings } from "@/types/canvas";
import { getVideoModelById } from "@/lib/video-models";
import { convertImageToVideo } from "@/utils/video-utils";
import { COLOR_MAP, CANVAS_STRINGS, VIDEO_DEFAULTS, CANVAS_DIMENSIONS } from "@/constants/canvas";

/**
 * Creates a unique generation ID with prefix
 */
export function createGenerationId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Uploads media if it's a data URL or blob URL
 */
export async function uploadMediaIfNeeded(
  url: string,
  falClient: any
): Promise<string> {
  if (url.startsWith("data:") || url.startsWith("blob:")) {
    const uploadResult = await falClient.storage.upload(
      await (await fetch(url)).blob()
    );
    return uploadResult;
  }
  return url;
}

/**
 * Creates a video generation configuration for image-to-video conversion
 */
export function createImageToVideoConfig(
  imageUrl: string,
  settings: VideoGenerationSettings,
  sourceImageId: string
) {
  return {
    cameraFixed: settings.cameraFixed,
    duration: settings.duration || VIDEO_DEFAULTS.DURATION,
    imageUrl,
    modelId: settings.modelId,
    prompt: settings.prompt || "",
    resolution: settings.resolution || VIDEO_DEFAULTS.RESOLUTION,
    seed: settings.seed,
    sourceImageId,
  };
}

/**
 * Creates a video generation configuration for video-to-video transformation
 */
export function createVideoToVideoConfig(
  videoUrl: string,
  settings: VideoGenerationSettings,
  videoDuration: number,
  sourceVideoId: string,
  isExtension = false
) {
  return {
    ...settings,
    duration: videoDuration || settings.duration || VIDEO_DEFAULTS.DURATION,
    imageUrl: videoUrl,
    isVideoExtension: isExtension,
    isVideoToVideo: true,
    modelId: settings.modelId || VIDEO_DEFAULTS.MODEL_ID,
    resolution: settings.resolution || VIDEO_DEFAULTS.RESOLUTION,
    sourceVideoId,
  };
}

/**
 * Creates a video generation configuration for background removal
 */
export function createBackgroundRemovalConfig(
  videoUrl: string,
  videoDuration: number,
  backgroundColor: string,
  sourceVideoId: string
) {
  return {
    backgroundColor: COLOR_MAP[backgroundColor] || "Black",
    duration: videoDuration || VIDEO_DEFAULTS.DURATION,
    imageUrl: videoUrl,
    modelConfig: getVideoModelById("bria-video-background-removal"),
    modelId: "bria-video-background-removal",
    prompt: CANVAS_STRINGS.VIDEO.REMOVING_BACKGROUND_PROMPT,
    sourceVideoId,
  };
}

/**
 * Handles completion of video generation
 */
export function handleVideoCompletion(
  videoId: string,
  videoUrl: string,
  duration: number,
  generation: any,
  images: PlacedImage[],
  videos: PlacedVideo[],
  selectedImageForVideo: string | null
): { newVideo: PlacedVideo | null; sourceType: "image" | "video" | null } {
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
  } else if (generation?.sourceVideoId) {
    const sourceVideo = videos.find((vid) => vid.id === generation.sourceVideoId);
    if (sourceVideo) {
      const newVideo: PlacedVideo = {
        currentTime: VIDEO_DEFAULTS.CURRENT_TIME,
        duration,
        height: sourceVideo.height,
        id: `video_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        isLooping: VIDEO_DEFAULTS.IS_LOOPING,
        isPlaying: VIDEO_DEFAULTS.IS_PLAYING,
        isVideo: true as const,
        muted: VIDEO_DEFAULTS.MUTED,
        rotation: VIDEO_DEFAULTS.ROTATION,
        src: videoUrl,
        volume: VIDEO_DEFAULTS.VOLUME,
        width: sourceVideo.width,
        x: sourceVideo.x + sourceVideo.width + CANVAS_DIMENSIONS.IMAGE_SPACING,
        y: sourceVideo.y,
      };
      return { newVideo, sourceType: "video" };
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
