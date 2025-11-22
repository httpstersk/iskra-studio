/**
 * Type definitions for variation generation
 *
 * @module lib/handlers/variation-types
 */

import type { PlacedImage, ActiveGeneration } from "@/types/canvas";

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
 * Configuration for image upload workflow
 */
export interface UploadWorkflowConfig {
  /** Selected source images */
  selectedImages: PlacedImage[];
  /** Setter for active generation states */
  setActiveGenerations: React.Dispatch<
    React.SetStateAction<Map<string, ActiveGeneration>>
  >;
  /** Timestamp for unique ID generation */
  timestamp: number;
}

/**
 * Result of the upload workflow
 */
export interface UploadWorkflowResult {
  /** Convex storage URLs of the uploaded images */
  imageUrls: string[];
  /** Signed URLs for tRPC/API calls */
  signedImageUrls: string[];
}

/**
 * Configuration for applying pixelated overlay to reference image
 */
export interface ApplyPixelatedOverlayConfig {
  /** Pixelated overlay data URL */
  pixelatedSrc: string | undefined;
  /** Selected source images */
  selectedImages: PlacedImage[];
  /** Setter for images state */
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
}

/**
 * Configuration for setting analyzing status
 */
export interface SetAnalyzingStatusConfig {
  /** Signed image URLs for analysis */
  signedImageUrls: string[];
  /** Setter for active generation states */
  setActiveGenerations: React.Dispatch<
    React.SetStateAction<Map<string, ActiveGeneration>>
  >;
  /** Timestamp for unique ID generation */
  timestamp: number;
}

/**
 * Configuration for handling variation generation errors
 */
export interface HandleVariationErrorConfig {
  /** The error that occurred */
  error: unknown;
  /** Setter for active generation states */
  setActiveGenerations: React.Dispatch<
    React.SetStateAction<Map<string, ActiveGeneration>>
  >;
  /** Setter for images state */
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
  /** Setter for global generating flag */
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  /** Optional selected images (for removing pixelated overlay from reference) */
  selectedImages?: PlacedImage[];
  /** Timestamp used to create placeholder IDs */
  timestamp: number;
}
