/**
 * Storyline Image Variation Handler (Refactored)
 * Orchestrates storyline image generation using service layer
 * Separated state management from business logic
 *
 * @module lib/handlers/storyline-image-variation-handler
 */

import type { ActiveGeneration, PlacedImage } from "@/types/canvas";
import { logger } from "@/shared/logging/logger";
import { handleError } from "@/shared/errors";
import {
  config,
  type ImageModel,
  type VariationCount,
} from "@/shared/config/runtime";
import { generateStorylineConcepts } from "@/features/generation/app-services/storyline-generation.service";
import {
  ensureImageInConvex,
  toSignedUrl,
} from "@/features/generation/app-services/image-storage.service";
import {
  createPlaceholderFactory,
  performEarlyPreparation,
  VARIATION_STATUS,
} from "./variation-shared-utils";
import {
  applyPixelatedOverlay,
  createVariationId,
  removeGenerationStatus,
  transitionGenerationStatus,
  updateGenerationStatus,
} from "./variation-state-helpers";
import { validateSingleImageSelection } from "./variation-utils";

const handlerLogger = logger.child({ handler: "storyline-image-variation" });

/**
 * Dependencies for storyline image variation handler
 */
export interface StorylineImageVariationHandlerDeps {
  imageModel?: ImageModel;
  images: PlacedImage[];
  selectedIds: string[];
  setActiveGenerations: React.Dispatch<
    React.SetStateAction<Map<string, import("@/types/canvas").ActiveGeneration>>
  >;
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  variationCount?: VariationCount;
  variationPrompt?: string;
}

/**
 * Generates storyline image variations from a reference image.
 *
 * Refactored approach:
 * - Business logic delegated to service layer
 * - State management isolated in this handler
 * - Clear separation of concerns for testability
 *
 * Process flow:
 * 1. Perform early preparation (pixelated overlay, positioning) for immediate UI feedback
 * 2. Upload/ensure image is in Convex storage
 * 3. Delegate to service layer for analysis and storyline generation
 * 4. Update UI state with placeholders and generation metadata
 */
export const handleStorylineImageVariations = async (
  deps: StorylineImageVariationHandlerDeps
): Promise<void> => {
  const {
    imageModel = config.imageGeneration.defaultModel,
    images,
    selectedIds,
    setActiveGenerations,
    setImages,
    setIsGenerating,
    variationCount = config.imageGeneration
      .defaultVariationCount as VariationCount,
    variationPrompt,
  } = deps;

  const selectedImage = validateSingleImageSelection(images, selectedIds);
  if (!selectedImage) return;

  setIsGenerating(true);
  const timestamp = Date.now();

  try {
    handlerLogger.info("Starting storyline image variations", {
      variationCount,
      hasPrompt: !!variationPrompt,
    });

    // OPTIMIZATION: Perform early preparation BEFORE async operations
    const {
      imageSizeDimensions,
      pixelatedSrc,
      positionIndices,
      snappedSource,
    } = await performEarlyPreparation(selectedImage, variationCount);

    // Stage 0: Upload image to ensure it's in Convex
    const uploadId = createVariationId(timestamp, "upload");

    updateGenerationStatus(setActiveGenerations, {
      generationId: uploadId,
      imageUrl: "",
      status: VARIATION_STATUS.UPLOADING,
    });

    const sourceImageUrl = selectedImage.fullSizeSrc || selectedImage.src;
    const imageUrl = await ensureImageInConvex(sourceImageUrl);

    removeGenerationStatus(setActiveGenerations, uploadId);

    const signedImageUrl = toSignedUrl(imageUrl);

    // Create factory function with shared configuration for all placeholders
    const makePlaceholder = createPlaceholderFactory({
      imageSizeDimensions,
      pixelatedSrc,
      positionIndices,
      selectedImage,
      snappedSource,
      timestamp,
    });

    // Stage 1: Apply pixelated overlay to reference image during analysis
    const analyzeId = createVariationId(timestamp, "analyze");

    applyPixelatedOverlay(setImages, {
      pixelatedSrc,
      selectedImageId: selectedImage.id,
    });

    updateGenerationStatus(setActiveGenerations, {
      generationId: analyzeId,
      imageUrl: signedImageUrl,
      status: VARIATION_STATUS.ANALYZING,
    });

    // Stage 2: Transition to storyline creation
    const storylineId = createVariationId(timestamp, "storyline");

    transitionGenerationStatus(setActiveGenerations, analyzeId, {
      generationId: storylineId,
      imageUrl: signedImageUrl,
      status: VARIATION_STATUS.CREATING_STORYLINE,
    });

    // DELEGATE TO SERVICE LAYER
    handlerLogger.info("Delegating to storyline generation service");

    const concepts = await generateStorylineConcepts({
      count: variationCount,
      imageUrl: signedImageUrl,
      userContext: variationPrompt,
    });

    removeGenerationStatus(setActiveGenerations, storylineId);

    // Stage 3: Create placeholders and active generations in single pass
    const placeholderImages: PlacedImage[] = [];
    const activeGenerations = new Map<string, ActiveGeneration>();

    concepts.forEach((concept, index) => {
      // Create placeholder with concept metadata
      const placeholder = makePlaceholder(
        {
          isStoryline: true,
          narrativeNote: concept.narrativeNote,
          timeLabel: concept.timeLabel,
        },
        index
      );
      placeholderImages.push(placeholder);

      // Create corresponding active generation
      const placeholderId = createVariationId(timestamp, index.toString());

      activeGenerations.set(placeholderId, {
        imageSize: imageSizeDimensions,
        imageUrl: signedImageUrl,
        isVariation: true,
        model: imageModel,
        prompt: concept.prompt,
        status: VARIATION_STATUS.GENERATING,
      });
    });

    setImages((prev) => [...prev, ...placeholderImages]);
    setActiveGenerations((prev) => new Map([...prev, ...activeGenerations]));

    handlerLogger.info("Storyline variations setup complete", {
      conceptCount: concepts.length,
    });

    setIsGenerating(false);
  } catch (error) {
    handlerLogger.error("Storyline variation handler failed", error as Error);
    handleError(error, {
      operation: "Storyline variation generation",
      context: { variationCount, selectedImageId: selectedImage?.id },
    });

    setIsGenerating(false);
  }
};
