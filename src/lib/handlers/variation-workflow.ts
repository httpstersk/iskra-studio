/**
 * Workflow utilities for variation generation
 *
 * Handles upload workflow, status management, and error handling
 * for variation generation processes.
 *
 * @module lib/handlers/variation-workflow
 */

import type { PlacedImage } from "@/types/canvas";
import { getOptimalImageDimensions } from "@/utils/image-crop-utils";
import { generateAndCachePixelatedOverlay } from "@/utils/image-pixelation-helper";
import { snapPosition } from "@/utils/snap-utils";
import { VARIATION_STATUS } from "./variation-constants";
import { getPositionIndices } from "./variation-placeholder";
import type {
  ApplyPixelatedOverlayConfig,
  EarlyPrepResult,
  HandleVariationErrorConfig,
  SetAnalyzingStatusConfig,
  UploadWorkflowConfig,
  UploadWorkflowResult,
} from "./variation-types";

/**
 * Performs early preparation phase before async operations.
 * Generates pixelated overlay and calculates positioning for immediate UI feedback.
 *
 * This should be called EARLY, before any async API operations (upload, analysis, etc.)
 * to ensure users see loading placeholders immediately.
 *
 * @param selectedImages - The source images selected for variation
 * @param variationCount - Number of variations to generate (4, 8, or 12)
 * @returns Promise resolving to preparation results
 */
export async function performEarlyPreparation(
  selectedImages: PlacedImage[],
  variationCount: number,
): Promise<EarlyPrepResult> {
  // Use the first image for positioning and sizing reference
  const primaryImage = selectedImages[0];

  // Snap source position for consistent alignment
  const snappedSource = snapPosition(primaryImage.x, primaryImage.y);

  // Get optimal dimensions for variations (4K resolution: 3840x2160 or 2160x3840)
  const imageSizeDimensions = getOptimalImageDimensions(
    primaryImage.width,
    primaryImage.height,
  );

  // Generate pixelated overlay EARLY for immediate visual feedback
  // We only generate overlay for the primary image for now
  const pixelatedSrc = await generateAndCachePixelatedOverlay(primaryImage);

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
 * Handles the image upload workflow with status updates.
 *
 * Performs the following:
 * 1. Sets UPLOADING status indicator
 * 2. Ensures images are uploaded to Convex storage
 * 3. Converts to signed URLs for API calls
 * 4. Removes UPLOADING status indicator
 *
 * @param config - Upload workflow configuration
 * @returns Promise resolving to image URLs
 */
export async function performImageUploadWorkflow(
  config: UploadWorkflowConfig,
): Promise<UploadWorkflowResult> {
  const { selectedImages, setActiveGenerations, timestamp } = config;

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

  // Upload/ensure images are in Convex
  const uploadPromises = selectedImages.map(async (img) => {
    const sourceImageUrl = img.fullSizeSrc || img.src;
    const imageUrl = await ensureImageInConvex(sourceImageUrl);
    const signedImageUrl = toSignedUrl(imageUrl);
    return { imageUrl, signedImageUrl };
  });

  const results = await Promise.all(uploadPromises);

  const imageUrls = results.map((r) => r.imageUrl);
  const signedImageUrls = results.map((r) => r.signedImageUrl);

  // Remove uploading status
  setActiveGenerations((prev) => {
    const newMap = new Map(prev);
    newMap.delete(uploadId);
    return newMap;
  });

  return { imageUrls, signedImageUrls };
}

/**
 * Applies pixelated overlay to the reference images during analysis.
 *
 * Updates the selected images to show a pixelated overlay, providing
 * visual feedback that analysis is in progress.
 *
 * @param config - Overlay configuration
 */
export function applyPixelatedOverlayToReferenceImage(
  config: ApplyPixelatedOverlayConfig,
): void {
  const { pixelatedSrc, selectedImages, setImages } = config;

  const selectedIds = new Set(selectedImages.map((img) => img.id));

  setImages((prev) =>
    prev.map((img) =>
      selectedIds.has(img.id) ? { ...img, pixelatedSrc } : img,
    ),
  );
}

/**
 * Sets analyzing status indicator and returns the process ID.
 *
 * @param config - Analyzing status configuration
 * @returns Process ID for later removal
 */
export function setAnalyzingStatus(config: SetAnalyzingStatusConfig): string {
  const { signedImageUrls, setActiveGenerations, timestamp } = config;

  const processId = `variation-${timestamp}-process`;

  setActiveGenerations((prev) => {
    const newMap = new Map(prev);
    newMap.set(processId, {
      imageUrl: signedImageUrls[0], // Use first image for status display
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

/**
 * Handles variation generation errors by marking placeholders with error state.
 *
 * This function provides consistent error handling across all variation handlers:
 * - Generates red error overlays for all placeholder images
 * - Marks all placeholder images for this timestamp with `hasContentError: true`
 * - Sets `isLoading: false` to stop loading animation
 * - Removes pixelated overlay from reference images (if provided)
 * - Clears all active generation states for this timestamp
 * - Sets generating flag to false
 *
 * @param config - Error handling configuration
 */
export async function handleVariationError(
  config: HandleVariationErrorConfig,
): Promise<void> {
  const {
    error,
    setActiveGenerations,
    setImages,
    setIsGenerating,
    selectedImages,
    timestamp,
  } = config;

  // Import utilities
  const { createErrorOverlayFromUrl } = await import(
    "@/utils/image-error-overlay"
  );
  const { extractFullErrorMessage } = await import(
    "@/utils/error-message-utils"
  );

  // Extract full error message for storage
  const fullErrorMessage = extractFullErrorMessage(error);

  // First, mark placeholders as errors immediately
  setImages((prev) =>
    prev.map((img) => {
      const match = img.id.match(/^variation-(\d+)-(\d+)$/);
      if (match && parseInt(match[1]) === timestamp) {
        return {
          ...img,
          errorMessage: fullErrorMessage,
          hasContentError: true,
          isLoading: false,
          opacity: 1.0,
        };
      }
      return img;
    }),
  );

  // Then generate red error overlays asynchronously
  // Get current images to work with
  let errorPlaceholders: PlacedImage[] = [];
  setImages((prev) => {
    errorPlaceholders = prev.filter((img) => {
      const match = img.id.match(/^variation-(\d+)-(\d+)$/);
      return match && parseInt(match[1]) === timestamp;
    });
    return prev;
  });

  // Generate error overlays in parallel
  // createErrorOverlayFromUrl always returns a valid overlay (uses fallback if source fails)
  const overlayPromises = errorPlaceholders.map(async (img) => {
    const sourceUrl = img.pixelatedSrc || img.src;
    const errorOverlay = await createErrorOverlayFromUrl(
      sourceUrl,
      img.width,
      img.height,
    );
    return { id: img.id, errorOverlay };
  });

  const overlays = await Promise.all(overlayPromises);

  // Update placeholders with red error overlays
  setImages((prev) =>
    prev.map((img) => {
      const overlay = overlays.find((o) => o.id === img.id);
      if (overlay) {
        return {
          ...img,
          pixelatedSrc: overlay.errorOverlay,
          src: overlay.errorOverlay,
        };
      }
      return img;
    }),
  );

  if (selectedImages && selectedImages.length > 0) {
    const selectedIds = new Set(selectedImages.map((img) => img.id));
    setImages((prev) =>
      prev.map((img) =>
        selectedIds.has(img.id) ? { ...img, pixelatedSrc: undefined } : img,
      ),
    );
  }

  // Clear any active generation states for this timestamp
  setActiveGenerations((prev) => {
    const newMap = new Map(prev);
    // Remove all generation states for this timestamp
    Array.from(newMap.keys()).forEach((key) => {
      if (key.includes(`variation-${timestamp}`)) {
        newMap.delete(key);
      }
    });
    return newMap;
  });

  setIsGenerating(false);
}
