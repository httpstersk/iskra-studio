/**
 * Placeholder creation utilities for variation generation
 *
 * Handles position calculation and placeholder image/video creation
 * for optimistic UI during generation.
 *
 * @module lib/handlers/variation-placeholder
 */

import type { PlacedImage, PlacedVideo } from "@/types/canvas";
import { VIDEO_DEFAULTS } from "@/constants/canvas";
import { snapPosition } from "@/utils/snap-utils";
import { VARIATION_CONSTANTS } from "./variation-constants";
import type {
  PlaceholderConfig,
  VariationBaseConfig,
  VideoPlaceholderConfig,
} from "./variation-types";

/**
 * Calculates position for a variation image around the source image.
 * Positions are arranged clockwise starting from top center.
 *
 * Position layout:
 * - For 4 variations: top, right, bottom, left (indices 0, 2, 4, 6)
 * - For 8 variations: all 8 positions around source (indices 0-7)
 * - For 12 variations: inner ring (0-7) + outer cardinal directions (8-11)
 *
 * @param sourceX - X coordinate of the source image
 * @param sourceY - Y coordinate of the source image
 * @param angleIndex - Index of the variation (0-11)
 * @param sourceWidth - Width of the source image
 * @param sourceHeight - Height of the source image
 * @param variationWidth - Width of the variation image
 * @param variationHeight - Height of the variation image
 * @returns Position object with x and y coordinates
 */
export function calculateBalancedPosition(
  sourceX: number,
  sourceY: number,
  angleIndex: number,
  sourceWidth: number,
  sourceHeight: number,
  variationWidth: number,
  variationHeight: number,
): { x: number; y: number } {
  switch (angleIndex) {
    case 0: // Top - aligned with source left edge
      return {
        x: sourceX,
        y: sourceY - variationHeight,
      };
    case 1: // Top-right corner
      return {
        x: sourceX + sourceWidth,
        y: sourceY - variationHeight,
      };
    case 2: // Right - aligned with source top edge
      return {
        x: sourceX + sourceWidth,
        y: sourceY,
      };
    case 3: // Bottom-right corner
      return {
        x: sourceX + sourceWidth,
        y: sourceY + sourceHeight,
      };
    case 4: // Bottom - aligned with source left edge
      return {
        x: sourceX,
        y: sourceY + sourceHeight,
      };
    case 5: // Bottom-left corner
      return {
        x: sourceX - variationWidth,
        y: sourceY + sourceHeight,
      };
    case 6: // Left - aligned with source top edge
      return {
        x: sourceX - variationWidth,
        y: sourceY,
      };
    case 7: // Top-left corner
      return {
        x: sourceX - variationWidth,
        y: sourceY - variationHeight,
      };
    case 8: // Top middle (outer) - centered horizontally, one image further out
      return {
        x: sourceX + sourceWidth / 2 - variationWidth / 2,
        y: sourceY - variationHeight * 2,
      };
    case 9: // Right middle (outer) - centered vertically, one image further out
      return {
        x: sourceX + sourceWidth * 2,
        y: sourceY + sourceHeight / 2 - variationHeight / 2,
      };
    case 10: // Bottom middle (outer) - centered horizontally, one image further out
      return {
        x: sourceX + sourceWidth / 2 - variationWidth / 2,
        y: sourceY + sourceHeight * 2,
      };
    case 11: // Left middle (outer) - centered vertically, one image further out
      return {
        x: sourceX - variationWidth * 2,
        y: sourceY + sourceHeight / 2 - variationHeight / 2,
      };
    default:
      return { x: sourceX, y: sourceY };
  }
}

/**
 * Creates a placeholder image for optimistic UI during generation.
 * Placeholders show immediately with pixelated overlay while actual generation happens.
 *
 * @param config - Configuration for placeholder creation
 * @returns Placeholder image object with loading state
 */
export function createPlaceholder(config: PlaceholderConfig): PlacedImage {
  const position = calculateBalancedPosition(
    config.sourceX,
    config.sourceY,
    config.positionIndex,
    config.sourceWidth,
    config.sourceHeight,
    config.sourceWidth,
    config.sourceHeight,
  );

  return {
    ...config.metadata, // Spread metadata at top level (e.g., cameraAngle, directorName)
    displayAsThumbnail: true,
    height: config.sourceHeight,
    id: `variation-${config.timestamp}-${config.variationIndex}`,
    isGenerated: true,
    isLoading: true,
    naturalHeight: config.naturalHeight,
    naturalWidth: config.naturalWidth,
    pixelatedSrc: config.pixelatedSrc,
    rotation: 0,
    src: config.src,
    width: config.sourceWidth,
    x: position.x,
    y: position.y,
  };
}

/**
 * Creates a placeholder factory function with shared configuration.
 * Reduces duplication across variation handlers by centralizing common parameters.
 *
 * @param baseConfig - Base configuration shared across all placeholders
 * @returns Factory function that creates placeholders with only metadata and index
 *
 * @example
 * ```typescript
 * const factory = createPlaceholderFactory({
 *   imageSizeDimensions,
 *   pixelatedSrc,
 *   positionIndices,
 *   selectedImage,
 *   snappedSource,
 *   timestamp,
 * });
 *
 * // Create placeholders with minimal code
 * const analyzing = factory({ isAnalyzing: true }, 0);
 * const storyline = factory({ isStoryline: true, timeLabel: "+1min" }, 1);
 * ```
 */
export function createPlaceholderFactory(baseConfig: VariationBaseConfig) {
  return (
    metadata: Record<string, unknown>,
    variationIndex: number,
  ): PlacedImage => {
    const {
      imageSizeDimensions,
      pixelatedSrc,
      positionIndices,
      selectedImage,
      snappedSource,
      timestamp,
    } = baseConfig;

    return createPlaceholder({
      metadata,
      naturalHeight: imageSizeDimensions.height,
      naturalWidth: imageSizeDimensions.width,
      pixelatedSrc,
      positionIndex: positionIndices[variationIndex],
      sourceHeight: selectedImage.height,
      sourceWidth: selectedImage.width,
      sourceX: snappedSource.x,
      sourceY: snappedSource.y,
      src: selectedImage.src,
      timestamp,
      variationIndex,
    });
  };
}

/**
 * Creates a placeholder video for optimistic UI during generation.
 * Placeholders show immediately with pixelated overlay while actual video generation happens.
 *
 * @param config - Configuration for video placeholder creation
 * @returns Placeholder video object with loading state
 */
export function createVideoPlaceholder(
  config: VideoPlaceholderConfig,
): PlacedVideo {
  const position = calculateBalancedPosition(
    config.sourceX,
    config.sourceY,
    config.positionIndex,
    config.sourceWidth,
    config.sourceHeight,
    config.sourceWidth,
    config.sourceHeight,
  );

  // Snap position to grid to align perfectly with ghost placeholders
  const snappedPosition = snapPosition(position.x, position.y);

  return {
    currentTime: VIDEO_DEFAULTS.CURRENT_TIME,
    duration: config.duration,
    height: config.sourceHeight,
    id: `sora-video-${config.timestamp}-${config.variationIndex}`,
    isLoading: true,
    isLooping: VIDEO_DEFAULTS.IS_LOOPING,
    isPlaying: VIDEO_DEFAULTS.IS_PLAYING,
    isVideo: true as const,
    ...(config.metadata && { metadata: config.metadata }),
    muted: VIDEO_DEFAULTS.MUTED,
    pixelatedSrc: config.pixelatedSrc,
    rotation: 0,
    sourceImageId: config.sourceImageId,
    src: "",
    volume: VIDEO_DEFAULTS.VOLUME,
    width: config.sourceWidth,
    x: snappedPosition.x,
    y: snappedPosition.y,
  };
}

/**
 * Determines position indices array based on variation count.
 *
 * @param variationCount - Number of variations to generate (4, 8, or 12)
 * @returns Array of position indices for balanced placement
 */
export function getPositionIndices(variationCount: number): number[] {
  if (variationCount === 4) {
    return VARIATION_CONSTANTS.FOUR_VARIATION_POSITIONS;
  } else if (variationCount === 8) {
    return VARIATION_CONSTANTS.EIGHT_VARIATION_POSITIONS;
  }
  return VARIATION_CONSTANTS.TWELVE_VARIATION_POSITIONS;
}
