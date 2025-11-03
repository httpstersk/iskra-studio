/**
 * Shared utilities for image variation handlers
 * Provides common functionality for Camera Angles, Storyline, and B-roll variation modes
 *
 * @module lib/handlers/variation-shared-utils
 */

import type { PlacedImage, PlacedVideo } from "@/types/canvas";
import { VIDEO_DEFAULTS } from "@/constants/canvas";
import { getOptimalImageDimensions } from "@/utils/image-crop-utils";
import { generateAndCachePixelatedOverlay } from "@/utils/image-pixelation-helper";
import { snapPosition } from "@/utils/snap-utils";

/**
 * Constants for variation generation
 */
export const VARIATION_CONSTANTS = {
  /** Positions for 4 variations (cardinal directions) */
  FOUR_VARIATION_POSITIONS: [0, 2, 4, 6] as number[],
  /** Positions for 8 variations (all 8 positions) */
  EIGHT_VARIATION_POSITIONS: [0, 1, 2, 3, 4, 5, 6, 7] as number[],
  /** Positions for 12 variations (inner ring + outer cardinal) */
  TWELVE_VARIATION_POSITIONS: [
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
  ] as number[],
};

/**
 * Status messages for variation generation stages
 */
export const VARIATION_STATUS = {
  ANALYZING: "analyzing",
  CREATING_STORYLINE: "creating-storyline",
  GENERATING: "generating",
  UPLOADING: "uploading",
} as const;

/**
 * Configuration for placeholder image creation
 */
export interface PlaceholderConfig {
  /** Optional metadata to attach to placeholder */
  metadata?: Record<string, unknown>;
  /** Natural height of the final image */
  naturalHeight: number;
  /** Natural width of the final image */
  naturalWidth: number;
  /** Pixelated overlay source URL */
  pixelatedSrc?: string;
  /** Position index for placement calculation */
  positionIndex: number;
  /** Height of the selected source image */
  sourceHeight: number;
  /** Width of the selected source image */
  sourceWidth: number;
  /** X coordinate of the selected source image (snapped) */
  sourceX: number;
  /** Y coordinate of the selected source image (snapped) */
  sourceY: number;
  /** Source image URL */
  src: string;
  /** Timestamp for unique ID generation */
  timestamp: number;
  /** Index of the variation */
  variationIndex: number;
}

/**
 * Base configuration shared across variation generation handlers.
 * Use with createPlaceholderFactory to reduce duplication.
 */
export interface VariationBaseConfig {
  /** Optimal dimensions for generated images */
  imageSizeDimensions: { height: number; width: number };
  /** Pixelated overlay data URL */
  pixelatedSrc: string | undefined;
  /** Position indices based on variation count */
  positionIndices: number[];
  /** Selected source image */
  selectedImage: PlacedImage;
  /** Snapped position for consistent alignment */
  snappedSource: { x: number; y: number };
  /** Timestamp for unique ID generation */
  timestamp: number;
}

/**
 * Configuration for placeholder video creation
 */
export interface VideoPlaceholderConfig {
  /** Video duration in seconds */
  duration: number;
  /** Optional metadata to attach to placeholder */
  metadata?: Record<string, unknown>;
  /** Pixelated overlay source URL */
  pixelatedSrc?: string;
  /** Position index for placement calculation */
  positionIndex: number;
  /** Source image ID that the video is generated from */
  sourceImageId: string;
  /** Height of the selected source image */
  sourceHeight: number;
  /** Width of the selected source image */
  sourceWidth: number;
  /** X coordinate of the selected source image (snapped) */
  sourceX: number;
  /** Y coordinate of the selected source image (snapped) */
  sourceY: number;
  /** Timestamp for unique ID generation */
  timestamp: number;
  /** Index of the variation */
  variationIndex: number;
}

/**
 * Result of early preparation phase before async operations
 */
export interface EarlyPrepResult {
  /** Optimal dimensions for generated images */
  imageSizeDimensions: {
    height: number;
    width: number;
  };
  /** Pixelated overlay data URL (undefined if generation failed) */
  pixelatedSrc: string | undefined;
  /** Position indices based on variation count */
  positionIndices: number[];
  /** Snapped position for consistent alignment */
  snappedSource: {
    x: number;
    y: number;
  };
}

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

/**
 * Performs early preparation phase before async operations.
 * Generates pixelated overlay and calculates positioning for immediate UI feedback.
 *
 * This should be called EARLY, before any async API operations (upload, analysis, etc.)
 * to ensure users see loading placeholders immediately.
 *
 * @param selectedImage - The source image selected for variation
 * @param variationCount - Number of variations to generate (4, 8, or 12)
 * @returns Promise resolving to preparation results
 */
export async function performEarlyPreparation(
  selectedImage: PlacedImage,
  variationCount: number,
): Promise<EarlyPrepResult> {
  // Snap source position for consistent alignment
  const snappedSource = snapPosition(selectedImage.x, selectedImage.y);

  // Get optimal dimensions for variations (4K resolution: 3840x2160 or 2160x3840)
  const imageSizeDimensions = getOptimalImageDimensions(
    selectedImage.width,
    selectedImage.height,
  );

  // Generate pixelated overlay EARLY for immediate visual feedback
  const pixelatedSrc = await generateAndCachePixelatedOverlay(selectedImage);

  // Position indices based on variation count
  const positionIndices = getPositionIndices(variationCount);

  return {
    imageSizeDimensions,
    pixelatedSrc,
    positionIndices,
    snappedSource,
  };
}

/**
 * Configuration for image upload workflow
 */
export interface UploadWorkflowConfig {
  /** Selected source image */
  selectedImage: PlacedImage;
  /** Setter for active generation states */
  setActiveGenerations: React.Dispatch<
    React.SetStateAction<Map<string, import("@/types/canvas").ActiveGeneration>>
  >;
  /** Timestamp for unique ID generation */
  timestamp: number;
}

/**
 * Result of the upload workflow
 */
export interface UploadWorkflowResult {
  /** Convex storage URL of the uploaded image */
  imageUrl: string;
  /** Signed URL for tRPC/API calls */
  signedImageUrl: string;
}

/**
 * Handles the image upload workflow with status updates.
 *
 * Performs the following:
 * 1. Sets UPLOADING status indicator
 * 2. Ensures image is uploaded to Convex storage
 * 3. Converts to signed URL for API calls
 * 4. Removes UPLOADING status indicator
 *
 * @param config - Upload workflow configuration
 * @returns Promise resolving to image URLs
 *
 * @example
 * ```typescript
 * const { imageUrl, signedImageUrl } = await performImageUploadWorkflow({
 *   selectedImage,
 *   setActiveGenerations,
 *   timestamp
 * });
 * ```
 */
export async function performImageUploadWorkflow(
  config: UploadWorkflowConfig,
): Promise<UploadWorkflowResult> {
  const { selectedImage, setActiveGenerations, timestamp } = config;

  // Import storage utilities (dynamic to avoid circular dependencies)
  const { ensureImageInConvex, toSignedUrl } = await import(
    "@/features/generation/app-services/image-storage.service"
  );

  const uploadId = `variation-${timestamp}-upload`;

  // Set uploading status
  setActiveGenerations((prev) => {
    const newMap = new Map(prev);
    newMap.set(uploadId, {
      imageUrl: "",
      isVariation: true,
      prompt: "",
      status: VARIATION_STATUS.UPLOADING,
    });
    return newMap;
  });

  // Upload/ensure image is in Convex
  const sourceImageUrl = selectedImage.fullSizeSrc || selectedImage.src;
  const imageUrl = await ensureImageInConvex(sourceImageUrl);
  const signedImageUrl = toSignedUrl(imageUrl);

  // Remove uploading status
  setActiveGenerations((prev) => {
    const newMap = new Map(prev);
    newMap.delete(uploadId);
    return newMap;
  });

  return { imageUrl, signedImageUrl };
}

/**
 * Configuration for applying pixelated overlay to reference image
 */
export interface ApplyPixelatedOverlayConfig {
  /** Pixelated overlay data URL */
  pixelatedSrc: string | undefined;
  /** Selected source image */
  selectedImage: PlacedImage;
  /** Setter for images state */
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
}

/**
 * Applies pixelated overlay to the reference image during analysis.
 *
 * Updates the selected image to show a pixelated overlay, providing
 * visual feedback that analysis is in progress.
 *
 * @param config - Overlay configuration
 *
 * @example
 * ```typescript
 * applyPixelatedOverlayToReferenceImage({
 *   pixelatedSrc,
 *   selectedImage,
 *   setImages
 * });
 * ```
 */
export function applyPixelatedOverlayToReferenceImage(
  config: ApplyPixelatedOverlayConfig,
): void {
  const { pixelatedSrc, selectedImage, setImages } = config;

  setImages((prev) =>
    prev.map((img) =>
      img.id === selectedImage.id ? { ...img, pixelatedSrc } : img,
    ),
  );
}

/**
 * Configuration for setting analyzing status
 */
export interface SetAnalyzingStatusConfig {
  /** Signed image URL for analysis */
  signedImageUrl: string;
  /** Setter for active generation states */
  setActiveGenerations: React.Dispatch<
    React.SetStateAction<Map<string, import("@/types/canvas").ActiveGeneration>>
  >;
  /** Timestamp for unique ID generation */
  timestamp: number;
}

/**
 * Sets analyzing status indicator and returns the process ID.
 *
 * @param config - Analyzing status configuration
 * @returns Process ID for later removal
 *
 * @example
 * ```typescript
 * const processId = setAnalyzingStatus({
 *   signedImageUrl,
 *   setActiveGenerations,
 *   timestamp
 * });
 * ```
 */
export function setAnalyzingStatus(config: SetAnalyzingStatusConfig): string {
  const { signedImageUrl, setActiveGenerations, timestamp } = config;

  const processId = `variation-${timestamp}-process`;

  setActiveGenerations((prev) => {
    const newMap = new Map(prev);
    newMap.set(processId, {
      imageUrl: signedImageUrl,
      isVariation: true,
      prompt: "",
      status: VARIATION_STATUS.ANALYZING,
    });
    return newMap;
  });

  return processId;
}

/**
 * Removes analyzing status indicator.
 *
 * @param processId - Process ID from setAnalyzingStatus
 * @param setActiveGenerations - Setter for active generation states
 *
 * @example
 * ```typescript
 * removeAnalyzingStatus(processId, setActiveGenerations);
 * ```
 */
export function removeAnalyzingStatus(
  processId: string,
  setActiveGenerations: React.Dispatch<
    React.SetStateAction<Map<string, import("@/types/canvas").ActiveGeneration>>
  >,
): void {
  setActiveGenerations((prev) => {
    const newMap = new Map(prev);
    newMap.delete(processId);
    return newMap;
  });
}
