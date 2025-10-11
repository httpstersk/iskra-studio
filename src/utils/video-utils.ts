/**
 * Video placement and metadata utilities
 * 
 * This module provides utilities for working with video elements on the canvas,
 * including duration retrieval, video placement calculations, and conversion
 * between images and videos.
 * 
 * @module video-utils
 */

/**
 * Retrieves the duration of a video from its URL by loading metadata.
 * Creates a temporary video element to extract duration information.
 * 
 * @param videoUrl - URL of the video
 * @returns Promise that resolves to the duration in seconds
 * 
 * @example
 * ```typescript
 * const duration = await getVideoDuration('https://example.com/video.mp4');
 * console.log(`Video is ${duration} seconds long`);
 * ```
 */
export const getVideoDuration = async (videoUrl: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = videoUrl;

    video.onloadedmetadata = () => {
      resolve(video.duration);

      // Clean up
      video.pause();
      video.removeAttribute("src");
      video.load();
    };

    video.onerror = () => {
      reject(new Error("Error loading video for duration check"));
    };

    video.load();
  });
};

/**
 * Creates a new PlacedVideo object with default playback settings.
 * 
 * @param id - Unique ID for the video
 * @param src - Video source URL
 * @param x - X position on canvas
 * @param y - Y position on canvas
 * @param width - Width on canvas
 * @param height - Height on canvas
 * @param duration - Video duration in seconds
 * @returns PlacedVideo object with default settings
 * 
 * @example
 * ```typescript
 * const video = createPlacedVideo(
 *   'vid-123',
 *   'https://example.com/video.mp4',
 *   100, 100, 300, 200, 30.5
 * );
 * ```
 */
export const createPlacedVideo = (
  id: string,
  src: string,
  x: number,
  y: number,
  width: number,
  height: number,
  duration: number,
) => {
  return {
    id,
    src,
    x,
    y,
    width,
    height,
    rotation: 0,
    isVideo: true,
    duration,
    currentTime: 0,
    isPlaying: false,
    volume: 1,
    muted: false,
    isLoaded: false, // Initialize as not loaded
  };
};

/**
 * Places a generated video on the canvas, centered in the current viewport.
 * Automatically calculates appropriate dimensions based on video aspect ratio.
 * 
 * @param videoUrl - URL of the generated video
 * @param duration - Duration of the video in seconds
 * @param canvasSize - Canvas dimensions
 * @param viewport - Current viewport position and scale
 * @returns Promise that resolves to a PlacedVideo object
 * 
 * @example
 * ```typescript
 * const video = await placeGeneratedVideo(
 *   'https://example.com/generated.mp4',
 *   15.5,
 *   { width: 1920, height: 1080 },
 *   { x: 0, y: 0, scale: 1.0 }
 * );
 * ```
 */
export const placeGeneratedVideo = async (
  videoUrl: string,
  duration: number,
  canvasSize: { width: number; height: number },
  viewport: { x: number; y: number; scale: number },
) => {
  // Create a video element to get dimensions
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.src = videoUrl;

  return new Promise((resolve, reject) => {
    video.onloadedmetadata = () => {
      try {
        const id = `video-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        // Calculate aspect ratio and size
        const aspectRatio = video.videoWidth / video.videoHeight;
        const maxSize = 300;
        let width = maxSize;
        let height = maxSize / aspectRatio;

        if (height > maxSize) {
          height = maxSize;
          width = maxSize * aspectRatio;
        }

        // Position in center of viewport
        const viewportCenterX =
          (canvasSize.width / 2 - viewport.x) / viewport.scale;
        const viewportCenterY =
          (canvasSize.height / 2 - viewport.y) / viewport.scale;
        const x = viewportCenterX - width / 2;
        const y = viewportCenterY - height / 2;

        // Create the placed video object
        const placedVideo = createPlacedVideo(
          id,
          videoUrl,
          x,
          y,
          width,
          height,
          duration,
        );

        // Clean up
        video.pause();
        video.removeAttribute("src");
        video.load();

        resolve(placedVideo);
      } catch (error) {
        reject(error);
      }
    };

    video.onerror = () => {
      reject(new Error("Error loading video for placement"));
    };

    video.load();
  });
};

/**
 * Converts an image to a video while preserving position, dimensions, and rotation.
 * Useful for image-to-video generation workflows.
 * 
 * @param image - The source image to convert
 * @param videoUrl - URL of the generated video
 * @param duration - Duration of the video in seconds
 * @param replaceOriginal - Whether to reuse the image ID (true) or generate new ID (false)
 * @returns The placed video object
 * 
 * @example
 * ```typescript
 * const video = convertImageToVideo(
 *   placedImage,
 *   'https://example.com/generated.mp4',
 *   10.0,
 *   true // Replace the original image
 * );
 * ```
 */
export const convertImageToVideo = (
  image: {
    id: string;
    src: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
  },
  videoUrl: string,
  duration: number,
  replaceOriginal: boolean = false,
) => {
  const id = replaceOriginal
    ? image.id
    : `video-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // Create the placed video object, preserving position and dimensions of the original image
  return createPlacedVideo(
    id,
    videoUrl,
    image.x,
    image.y,
    image.width,
    image.height,
    duration,
  );
};
