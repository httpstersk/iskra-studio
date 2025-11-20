/**
 * Storyline Image Variation Handler (Refactored)
 * Orchestrates storyline image generation using service layer
 * Separated state management from business logic
 * Uses errors-as-values pattern with @safe-std/error
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
  handleVariationError,
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
import { tryPromise, isErr } from "@/lib/errors/safe-errors";

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
    variationCount = config.imageGeneration
      .defaultVariationCount as VariationCount,
    variationPrompt,
  } = deps;

  const selectedImage = validateSingleImageSelection(images, selectedIds);
  if (!selectedImage) return;

  setIsGenerating(true);
  const timestamp = Date.now();

  handlerLogger.info("Starting storyline image variations", {
    variationCount,
    hasPrompt: !!variationPrompt,
  });

  // OPTIMIZATION: Perform early preparation BEFORE async operations
  const preparationResult = await tryPromise(
    performEarlyPreparation(selectedImage, variationCount)
  );

  if (isErr(preparationResult)) {
    handlerLogger.error("Early preparation failed", preparationResult.payload as Error);
    handleError(preparationResult.payload, {
      operation: "Storyline variation preparation",
      context: { variationCount, selectedImageId: selectedImage?.id },
    });

    await handleVariationError({
      error: preparationResult.payload,
      selectedImage,
      setActiveGenerations,
      setImages,
      setIsGenerating,
      timestamp,
    });
    return;
  }

  const {
    imageSizeDimensions,
    pixelatedSrc,
    positionIndices,
    snappedSource,
  } = preparationResult;

  // Create factory function with shared configuration for all placeholders
  const makePlaceholder = createPlaceholderFactory({
    imageSizeDimensions,
    pixelatedSrc,
    positionIndices,
    selectedImage,
    snappedSource,
    timestamp,
  });

  // Create placeholders IMMEDIATELY for optimistic UI (BEFORE upload)
  const placeholderImages: PlacedImage[] = Array.from(
    { length: variationCount },
    (_, index) => makePlaceholder({}, index),
  );

  setImages((prev) => [...prev, ...placeholderImages]);

  // Stage 0: Upload image to ensure it's in Convex
  const uploadId = createVariationId(timestamp, "upload");

  updateGenerationStatus(setActiveGenerations, {
    generationId: uploadId,
    imageUrl: "",
    status: VARIATION_STATUS.UPLOADING,
  });

  const sourceImageUrl = selectedImage.fullSizeSrc || selectedImage.src;
  const imageUrl = await ensureImageInConvex(sourceImageUrl);

  if (imageUrl && typeof imageUrl === 'object' && 'message' in imageUrl) {
    handlerLogger.error("Image upload failed", imageUrl as Error);
    handleError(imageUrl as Error, {
      operation: "Storyline variation upload",
      context: { variationCount, selectedImageId: selectedImage?.id },
    });

    removeGenerationStatus(setActiveGenerations, uploadId);

    await handleVariationError({
      error: imageUrl as Error,
      selectedImage,
      setActiveGenerations,
      setImages,
      setIsGenerating,
      timestamp,
    });
    return;
  }

  removeGenerationStatus(setActiveGenerations, uploadId);

  const signedImageUrl = toSignedUrl(imageUrl as string);

  if (signedImageUrl && typeof signedImageUrl === 'object' && 'message' in signedImageUrl) {
    handlerLogger.error("URL conversion failed", signedImageUrl as Error);
    handleError(signedImageUrl as Error, {
      operation: "Storyline variation URL conversion",
      context: { variationCount, selectedImageId: selectedImage?.id },
    });

    await handleVariationError({
      error: signedImageUrl as Error,
      selectedImage,
      setActiveGenerations,
      setImages,
      setIsGenerating,
      timestamp,
    });
    return;
  }

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

  // DELEGATE TO SERVICE LAYER
  handlerLogger.info("Delegating to storyline generation service");

  // Stage 2: Transition to storyline creation
  const storylineId = createVariationId(timestamp, "storyline");

  transitionGenerationStatus(setActiveGenerations, analyzeId, {
    generationId: storylineId,
    imageUrl: signedImageUrl,
    status: VARIATION_STATUS.CREATING_STORYLINE,
  });

  const conceptsResult = await tryPromise(
    generateStorylineConcepts({
      count: variationCount,
      imageUrl: signedImageUrl,
      userContext: variationPrompt,
    })
  );

  if (isErr(conceptsResult)) {
    handlerLogger.error("Storyline concept generation failed", conceptsResult.payload as Error);
    handleError(conceptsResult.payload, {
      operation: "Storyline variation generation",
      context: { variationCount, selectedImageId: selectedImage?.id },
    });

    removeGenerationStatus(setActiveGenerations, storylineId);

    await handleVariationError({
      error: conceptsResult.payload,
      selectedImage,
      setActiveGenerations,
      setImages,
      setIsGenerating,
      timestamp,
    });
    return;
  }

  const concepts = conceptsResult;

  removeGenerationStatus(setActiveGenerations, storylineId);

  // Stage 3: Update existing placeholders with storyline metadata and set up active generations
  const activeGenerations = new Map<string, ActiveGeneration>();

  setImages((prev) =>
    prev.map((img) => {
      // Check if this is one of our variation placeholders
      const match = img.id.match(/^variation-(\d+)-(\d+)$/);
      if (match && parseInt(match[1]) === timestamp) {
        const index = parseInt(match[2]);
        const concept = concepts[index];
        if (concept) {
          // Set up active generation for this placeholder
          const placeholderId = createVariationId(
            timestamp,
            index.toString(),
          );
          activeGenerations.set(placeholderId, {
            imageSize: imageSizeDimensions,
            imageUrl: signedImageUrl,
            isVariation: true,
            model: imageModel,
            prompt: concept.prompt,
            status: VARIATION_STATUS.GENERATING,
          });

          // Return updated placeholder with storyline metadata
          return {
            ...img,
            isStoryline: true,
            narrativeNote: concept.narrativeNote,
            timeLabel: concept.timeLabel,
          };
        }
      }
      return img;
    }),
  );

  setActiveGenerations((prev) => new Map([...prev, ...activeGenerations]));

  handlerLogger.info("Storyline variations setup complete", {
    conceptCount: concepts.length,
  });

  setIsGenerating(false);
};
