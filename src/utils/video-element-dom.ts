/**
 * Utility functions for video element DOM manipulation
 *
 * @module utils/video-element-dom
 */

/**
 * Prefix for video element IDs
 */
const VIDEO_ELEMENT_ID_PREFIX = "video-";

/**
 * Safely retrieves a video element from the DOM by video ID
 *
 * @param videoId - The video ID to construct the element ID
 * @returns The HTMLVideoElement if found and valid, null otherwise
 */
export function getVideoElement(videoId: string): HTMLVideoElement | null {
  if (!videoId || typeof videoId !== "string") {
    console.warn("Invalid video ID provided:", videoId);
    return null;
  }

  const elementId = `${VIDEO_ELEMENT_ID_PREFIX}${videoId}`;
  const element = document.getElementById(elementId);

  if (!element) {
    return null;
  }

  if (!(element instanceof HTMLVideoElement)) {
    console.warn(`Element with ID ${elementId} is not a video element`);
    return null;
  }

  return element;
}

/**
 * Toggles play/pause state of a video element
 *
 * @param videoId - The video ID
 * @param shouldPlay - Whether the video should play
 * @returns Promise that resolves when the operation completes
 */
export async function toggleVideoPlayback(
  videoId: string,
  shouldPlay: boolean
): Promise<void> {
  const videoEl = getVideoElement(videoId);
  if (!videoEl) return;

  try {
    if (shouldPlay) {
      await videoEl.play();
    } else {
      videoEl.pause();
    }
  } catch (error) {
    console.error("Error toggling video playback:", error);
  }
}

/**
 * Seeks to a specific time in a video element
 *
 * @param videoId - The video ID
 * @param time - Time in seconds to seek to
 */
export function seekVideo(videoId: string, time: number): void {
  if (typeof time !== "number" || !Number.isFinite(time) || time < 0) {
    console.warn("Invalid seek time provided:", time);
    return;
  }

  const videoEl = getVideoElement(videoId);
  if (!videoEl) return;

  videoEl.currentTime = time;
}
