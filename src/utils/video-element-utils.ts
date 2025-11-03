/**
 * Video element lifecycle and management utilities
 *
 * This module provides comprehensive utilities for managing HTML video elements
 * in canvas applications, including creation, event handling, playback control,
 * and proper cleanup to prevent memory leaks.
 *
 * @module video-element-utils
 */

/**
 * Configuration options for creating a video element
 */
export interface VideoElementConfig {
  /** Source URL of the video */
  src: string;
  /** Whether the video should be muted */
  muted?: boolean;
  /** Volume level (0-1) */
  volume?: number;
  /** Initial playback time in seconds */
  currentTime?: number;
  /** Whether the video should loop */
  loop?: boolean;
  /** Preload strategy ('none' | 'metadata' | 'auto') */
  preload?: "none" | "metadata" | "auto";
}

/**
 * Video element event handlers
 */
export interface VideoElementHandlers {
  /** Called when video metadata is loaded */
  onLoadedMetadata?: (video: HTMLVideoElement) => void;
  /** Called when video playback time updates */
  onTimeUpdate?: (currentTime: number) => void;
  /** Called when video playback ends */
  onEnded?: () => void;
  /** Called when video data is loaded and ready */
  onLoadedData?: (video: HTMLVideoElement) => void;
  /** Called when an error occurs */
  onError?: (error: Event) => void;
}

/**
 * Creates and configures an HTML video element with optimized settings
 * for canvas rendering and performance.
 *
 * @param config - Configuration options for the video element
 * @returns Configured HTMLVideoElement instance
 *
 * @example
 * ```typescript
 * const video = createVideoElement({
 *   src: 'https://example.com/video.mp4',
 *   muted: true,
 *   loop: true,
 *   preload: 'metadata'
 * });
 * ```
 */
export function createVideoElement(
  config: VideoElementConfig,
): HTMLVideoElement {
  const {
    src,
    muted = false,
    volume = 1,
    currentTime = 0,
    loop = false,
    preload = "metadata",
  } = config;

  const video = document.createElement("video");
  video.src = src;
  video.crossOrigin = "anonymous";
  video.muted = muted;
  video.volume = volume;
  video.currentTime = currentTime;
  video.loop = loop;
  video.preload = preload;
  video.playsInline = true;
  video.disablePictureInPicture = true;

  return video;
}

/**
 * Attaches event handlers to a video element with proper cleanup support.
 * Returns a cleanup function that removes all attached listeners.
 *
 * @param video - The video element to attach handlers to
 * @param handlers - Object containing event handler callbacks
 * @returns Cleanup function that removes all event listeners
 *
 */
export function attachVideoHandlers(
  video: HTMLVideoElement,
  handlers: VideoElementHandlers,
): () => void {
  const listeners: Array<{ event: string; handler: EventListener }> = [];

  if (handlers.onLoadedMetadata) {
    const handler = () => handlers.onLoadedMetadata?.(video);
    video.addEventListener("loadedmetadata", handler);
    listeners.push({ event: "loadedmetadata", handler });
  }

  if (handlers.onTimeUpdate) {
    const handler = () => handlers.onTimeUpdate?.(video.currentTime);
    video.addEventListener("timeupdate", handler);
    listeners.push({ event: "timeupdate", handler });
  }

  if (handlers.onEnded) {
    const handler = () => handlers.onEnded?.();
    video.addEventListener("ended", handler);
    listeners.push({ event: "ended", handler });
  }

  if (handlers.onLoadedData) {
    const handler = () => handlers.onLoadedData?.(video);
    video.addEventListener("loadeddata", handler);
    listeners.push({ event: "loadeddata", handler });
  }

  if (handlers.onError) {
    const handler = (e: Event) => handlers.onError?.(e);
    video.addEventListener("error", handler);
    listeners.push({ event: "error", handler });
  }

  // Return cleanup function
  return () => {
    listeners.forEach(({ event, handler }) => {
      video.removeEventListener(event, handler);
    });
  };
}

/**
 * Safely cleans up a video element, removing all sources and stopping playback.
 * This prevents memory leaks and ensures proper resource cleanup.
 *
 * @param video - The video element to clean up
 *
 * @example
 * ```typescript
 * const video = document.createElement('video');
 * video.src = 'video.mp4';
 *
 * // When done with the video:
 * cleanupVideoElement(video);
 * ```
 */
export function cleanupVideoElement(video: HTMLVideoElement): void {
  video.pause();
  video.removeAttribute("src");
  video.load();
}

/**
 * Controls video playback state with error handling.
 *
 * @param video - The video element to control
 * @param shouldPlay - Whether the video should play (true) or pause (false)
 * @param onError - Optional error handler
 * @returns Promise that resolves when playback state changes
 *
 */
export async function setVideoPlayback(
  video: HTMLVideoElement,
  shouldPlay: boolean,
  onError?: (error: Error) => void,
): Promise<void> {
  try {
    if (shouldPlay) {
      await video.play();
    } else {
      video.pause();
    }
  } catch (error) {
    if (onError) {
      onError(error as Error);
    }
  }
}

/**
 * Updates video volume and mute state.
 *
 * @param video - The video element to update
 * @param volume - Volume level (0-1)
 * @param muted - Whether the video should be muted
 *
 * @example
 * ```typescript
 * setVideoVolume(videoElement, 0.5, false); // 50% volume, unmuted
 * ```
 */
export function setVideoVolume(
  video: HTMLVideoElement,
  volume: number,
  muted: boolean,
): void {
  video.volume = Math.max(0, Math.min(1, volume));
  video.muted = muted;
}

/**
 * Seeks to a specific time in the video with threshold checking
 * to avoid unnecessary seeks during normal playback.
 *
 * @param video - The video element to seek
 * @param targetTime - Target time in seconds
 * @param threshold - Minimum difference to trigger seek (default: 2 seconds)
 * @returns Whether a seek was performed
 *
 * @example
 * ```typescript
 * // Only seeks if difference is > 2 seconds
 * const didSeek = seekVideo(videoElement, 10);
 * ```
 */
export function seekVideo(
  video: HTMLVideoElement,
  targetTime: number,
  threshold = 2,
): boolean {
  if (Math.abs(video.currentTime - targetTime) > threshold) {
    video.currentTime = targetTime;
    return true;
  }
  return false;
}

/**
 * Creates a complete video element with handlers and returns both
 * the element and a cleanup function.
 *
 * @param config - Configuration for the video element
 * @param handlers - Event handlers for the video
 * @returns Object containing the video element and cleanup function
 *
 */
export function createVideoWithHandlers(
  config: VideoElementConfig,
  handlers: VideoElementHandlers,
): { video: HTMLVideoElement; cleanup: () => void } {
  const video = createVideoElement(config);
  const cleanup = attachVideoHandlers(video, handlers);
  video.load();

  return { video, cleanup };
}
