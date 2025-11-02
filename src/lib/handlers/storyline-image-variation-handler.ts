/**
 * Storyline Image Variation Handler (Refactored)
 * Orchestrates storyline image generation using service layer
 * Separated state management from business logic
 *
 * @module lib/handlers/storyline-image-variation-handler
 */

import type { PlacedImage } from "@/types/canvas";
import { logger } from "@/shared/logging/logger";
import { handleError } from "@/shared/errors";
import { config, type ImageModel, type VariationCount } from "@/shared/config/runtime";
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
  deps: StorylineImageVariationHandlerDeps,
): Promise<void> => {
  const {
    imageModel = config.imageGeneration.defaultModel,
    images,
    selectedIds,
    setActiveGenerations,
    setImages,
    setIsGenerating,
    variationCount = config.imageGeneration.defaultVariationCount as VariationCount,
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
    const uploadId = `variation-${timestamp}-upload`;

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

    const sourceImageUrl = selectedImage.fullSizeSrc || selectedImage.src;
    const imageUrl = await ensureImageInConvex(sourceImageUrl);

    setActiveGenerations((prev) => {
      const newMap = new Map(prev);
      newMap.delete(uploadId);
      return newMap;
    });

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

    // Stage 1: Analyzing placeholder
    const analyzeId = `variation-${timestamp}-analyze`;
    const analyzingPlaceholder = makePlaceholder(
      {
        isAnalyzing: true,
        statusMessage: "Analyzing image...",
      },
      0,
    );

    setImages((prev) => [...prev, analyzingPlaceholder]);
    setActiveGenerations((prev) => {
      const newMap = new Map(prev);
      newMap.set(analyzeId, {
        imageUrl: signedImageUrl,
        isVariation: true,
        prompt: "",
        status: VARIATION_STATUS.ANALYZING,
      });
      return newMap;
    });

    // Stage 2: Storyline placeholder
    const storylineId = `variation-${timestamp}-storyline`;
    const storylinePlaceholder = makePlaceholder(
      {
        isCreatingStoryline: true,
        statusMessage: "Creating storyline...",
      },
      0,
    );

    // DELEGATE TO SERVICE LAYER
    handlerLogger.info("Delegating to storyline generation service");

    const concepts = await generateStorylineConcepts({
      count: variationCount,
      imageUrl: signedImageUrl,
      userContext: variationPrompt,
    });

    // Remove analyzing and storyline placeholders
    setImages((prev) =>
      prev.filter(
        (img) =>
          img.id !== analyzingPlaceholder.id &&
          img.id !== storylinePlaceholder.id,
      ),
    );
    setActiveGenerations((prev) => {
      const newMap = new Map(prev);
      newMap.delete(analyzeId);
      newMap.delete(storylineId);
      return newMap;
    });

    // Stage 3: Create generation placeholders
    const formattedPrompts = concepts.map((c) => c.prompt);
    const narrativeNotes = concepts.map((c) => c.narrativeNote);
    const timeLabels = concepts.map((c) => c.timeLabel);

    const placeholderImages: PlacedImage[] = formattedPrompts.map((_, index) =>
      makePlaceholder(
        {
          isStoryline: true,
          narrativeNote: narrativeNotes[index],
          timeLabel: timeLabels[index],
        },
        index,
      ),
    );

    setImages((prev) => [...prev, ...placeholderImages]);

    setActiveGenerations((prev) => {
      const newMap = new Map(prev);
      formattedPrompts.forEach((formattedPrompt, index) => {
        const placeholderId = `variation-${timestamp}-${index}`;
        newMap.set(placeholderId, {
          imageSize: imageSizeDimensions,
          imageUrl: signedImageUrl,
          isVariation: true,
          model: imageModel,
          prompt: formattedPrompt,
          status: VARIATION_STATUS.GENERATING,
        });
      });
      return newMap;
    });

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
