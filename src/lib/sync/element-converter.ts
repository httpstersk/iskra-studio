/**
 * Conversion utilities for elements between runtime and persistence formats.
 * 
 * Handles mapping between:
 * - PlacedImage/PlacedVideo (runtime format used in canvas)
 * - CanvasElement (persistence format saved to Convex)
 */

import type { CanvasElement } from "@/types/project";
import type { PlacedImage, PlacedVideo } from "@/types/canvas";

/**
 * Converts a PlacedImage to a CanvasElement for persistence.
 * 
 * Maps runtime image properties to the persistence format,
 * including asset reference if available.
 * 
 * @param image - PlacedImage from canvas state
 * @returns CanvasElement for saving to Convex
 * 
 * @example
 * ```ts
 * const element = convertImageToElement(placedImage);
 * canvasState.elements.push(element);
 * ```
 */
export function convertImageToElement(image: PlacedImage): CanvasElement {
  return {
    assetId: image.assetId,
    assetSyncedAt: image.assetSyncedAt,
    assetType: "image",
    height: image.height,
    id: image.id,
    transform: {
      rotation: image.rotation,
      scale: 1,
      x: image.x,
      y: image.y,
    },
    type: "image",
    width: image.width,
    zIndex: 0, // TODO: Get from actual z-index tracking
  };
}

/**
 * Converts a PlacedVideo to a CanvasElement for persistence.
 * 
 * Maps runtime video properties to the persistence format,
 * including playback state and asset reference.
 * 
 * @param video - PlacedVideo from canvas state
 * @returns CanvasElement for saving to Convex
 * 
 * @example
 * ```ts
 * const element = convertVideoToElement(placedVideo);
 * canvasState.elements.push(element);
 * ```
 */
export function convertVideoToElement(video: PlacedVideo): CanvasElement {
  return {
    assetId: video.assetId,
    assetSyncedAt: video.assetSyncedAt,
    assetType: "video",
    currentTime: video.currentTime,
    duration: video.duration,
    height: video.height,
    id: video.id,
    isPlaying: video.isPlaying,
    muted: video.muted,
    transform: {
      rotation: video.rotation,
      scale: 1,
      x: video.x,
      y: video.y,
    },
    type: "video",
    volume: video.volume,
    width: video.width,
    zIndex: 0, // TODO: Get from actual z-index tracking
  };
}

/**
 * Converts a CanvasElement back to PlacedImage for runtime use.
 * 
 * Restores runtime image properties from persistence format.
 * Note: Some properties like naturalWidth/naturalHeight must be
 * fetched separately after image loads.
 * 
 * @param element - CanvasElement from Convex
 * @param imageSrc - URL for rendering the image
 * @returns PlacedImage for use in canvas
 * 
 * @example
 * ```ts
 * const image = convertElementToImage(element, imageUrl);
 * setImages(prev => [...prev, image]);
 * ```
 */
export function convertElementToImage(
  element: CanvasElement,
  imageSrc: string
): PlacedImage {
  return {
    assetId: element.assetId,
    assetSyncedAt: element.assetSyncedAt,
    height: element.height || 300,
    id: element.id,
    rotation: element.transform.rotation,
    src: imageSrc,
    width: element.width || 300,
    x: element.transform.x,
    y: element.transform.y,
  };
}

/**
 * Converts a CanvasElement back to PlacedVideo for runtime use.
 * 
 * Restores runtime video properties from persistence format.
 * 
 * @param element - CanvasElement from Convex
 * @param videoSrc - URL for rendering the video
 * @returns PlacedVideo for use in canvas
 * 
 * @example
 * ```ts
 * const video = convertElementToVideo(element, videoUrl);
 * setVideos(prev => [...prev, video]);
 * ```
 */
export function convertElementToVideo(
  element: CanvasElement,
  videoSrc: string
): PlacedVideo {
  return {
    assetId: element.assetId,
    assetSyncedAt: element.assetSyncedAt,
    currentTime: element.currentTime || 0,
    duration: element.duration || 0,
    height: element.height || 300,
    id: element.id,
    isPlaying: element.isPlaying || false,
    isVideo: true,
    muted: element.muted || false,
    rotation: element.transform.rotation,
    src: videoSrc,
    volume: element.volume || 1,
    width: element.width || 300,
    x: element.transform.x,
    y: element.transform.y,
  };
}

/**
 * Converts PlacedImage/PlacedVideo arrays to CanvasElements for persistence.
 * 
 * Combines images and videos into a single elements array,
 * suitable for saving to Convex.
 * 
 * @param images - Array of PlacedImages
 * @param videos - Array of PlacedVideos
 * @returns Array of CanvasElements
 * 
 * @example
 * ```ts
 * const elements = mergeToElements(canvasState.images, canvasState.videos);
 * await saveProject({ elements });
 * ```
 */
export function mergeToElements(
  images: PlacedImage[],
  videos: PlacedVideo[]
): CanvasElement[] {
  const elements: CanvasElement[] = [];

  for (const image of images) {
    elements.push(convertImageToElement(image));
  }

  for (const video of videos) {
    elements.push(convertVideoToElement(video));
  }

  return elements;
}

/**
 * Separates CanvasElements into runtime PlacedImage/PlacedVideo arrays.
 * 
 * Converts persistence format back to runtime format.
 * Requires asset data or URLs for rendering.
 * 
 * @param elements - Array of CanvasElements
 * @param assetUrls - Map of asset ID to URL for rendering
 * @returns Object with images and videos arrays
 * 
 * @example
 * ```ts
 * const { images, videos } = separateElements(
 *   project.canvasState.elements,
 *   assetUrlMap
 * );
 * setImages(images);
 * setVideos(videos);
 * ```
 */
export function separateElements(
  elements: CanvasElement[],
  assetUrls: Map<string, string>
): {
  images: PlacedImage[];
  videos: PlacedVideo[];
} {
  const images: PlacedImage[] = [];
  const videos: PlacedVideo[] = [];

  for (const element of elements) {
    // Get URL from asset or element
    const url = element.assetId
      ? assetUrls.get(element.assetId) || ""
      : "";

    if (!url) {
      console.warn(`No URL found for element ${element.id}`);
      continue;
    }

    if (element.type === "image") {
      images.push(convertElementToImage(element, url));
    } else if (element.type === "video") {
      videos.push(convertElementToVideo(element, url));
    }
  }

  return { images, videos };
}
