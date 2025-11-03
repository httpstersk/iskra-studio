/**
 * State management helpers for variation handlers
 * Reduces duplication across variation handler implementations
 *
 * @module lib/handlers/variation-state-helpers
 */

import type { ActiveGeneration, PlacedImage } from "@/types/canvas";

/**
 * Configuration for updating active generation status
 */
interface UpdateGenerationStatusConfig {
  generationId: string;
  imageUrl: string;
  status: ActiveGeneration["status"];
}

/**
 * Configuration for applying pixelated overlay to reference image
 */
interface ApplyPixelatedOverlayConfig {
  pixelatedSrc: string | undefined;
  selectedImageId: string;
}

/**
 * Generates a unique ID for variation operations
 *
 * @param timestamp - Timestamp for uniqueness
 * @param suffix - Operation suffix (e.g., 'upload', 'analyze', 'storyline')
 * @returns Unique variation operation ID
 */
export function createVariationId(timestamp: number, suffix: string): string {
  return `variation-${timestamp}-${suffix}`;
}

/**
 * Updates active generation status in a single operation
 *
 * @param setActiveGenerations - State setter for active generations
 * @param config - Configuration for the status update
 */
export function updateGenerationStatus(
  setActiveGenerations: React.Dispatch<
    React.SetStateAction<Map<string, ActiveGeneration>>
  >,
  config: UpdateGenerationStatusConfig,
): void {
  setActiveGenerations((prev) => {
    const newMap = new Map(prev);

    newMap.set(config.generationId, {
      imageUrl: config.imageUrl,
      isVariation: true,
      prompt: "",
      status: config.status,
    });

    return newMap;
  });
}

/**
 * Removes an active generation status
 *
 * @param setActiveGenerations - State setter for active generations
 * @param generationId - ID of the generation to remove
 */
export function removeGenerationStatus(
  setActiveGenerations: React.Dispatch<
    React.SetStateAction<Map<string, ActiveGeneration>>
  >,
  generationId: string,
): void {
  setActiveGenerations((prev) => {
    const newMap = new Map(prev);
    newMap.delete(generationId);
    return newMap;
  });
}

/**
 * Transitions from one generation status to another
 *
 * @param setActiveGenerations - State setter for active generations
 * @param fromId - ID to remove
 * @param toConfig - Configuration for new status
 */
export function transitionGenerationStatus(
  setActiveGenerations: React.Dispatch<
    React.SetStateAction<Map<string, ActiveGeneration>>
  >,
  fromId: string,
  toConfig: UpdateGenerationStatusConfig,
): void {
  setActiveGenerations((prev) => {
    const newMap = new Map(prev);

    newMap.delete(fromId);
    newMap.set(toConfig.generationId, {
      imageUrl: toConfig.imageUrl,
      isVariation: true,
      prompt: "",
      status: toConfig.status,
    });

    return newMap;
  });
}

/**
 * Applies pixelated overlay to the reference image
 *
 * @param setImages - State setter for images
 * @param config - Configuration for applying overlay
 */
export function applyPixelatedOverlay(
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>,
  config: ApplyPixelatedOverlayConfig,
): void {
  setImages((prev) =>
    prev.map((img) =>
      img.id === config.selectedImageId
        ? { ...img, pixelatedSrc: config.pixelatedSrc }
        : img,
    ),
  );
}
