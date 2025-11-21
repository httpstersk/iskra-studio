/**
 * Director Image Variation Handler
 * Orchestrates director-style image generation using FIBO + director refinement
 * Uses errors-as-values pattern with @safe-std/error
 *
 * @module lib/handlers/director-image-variation-handler
 */

import { selectRandomVisualStylists } from "@/constants/visual-stylists";
import { fiboStructuredToText } from "@/lib/utils/fibo-to-text";
import {
  config,
  type ImageModel,
  type VariationCount,
} from "@/shared/config/runtime";
import { handleError } from "@/shared/errors";
import type { PlacedImage } from "@/types/canvas";
import {
  applyPixelatedOverlayToReferenceImage,
  createPlaceholderFactory,
  handleVariationError,
  performEarlyPreparation,
  performImageUploadWorkflow,
  removeAnalyzingStatus,
  setAnalyzingStatus,
  VARIATION_STATUS,
} from "./variation-shared-utils";
import { validateSingleImageSelection } from "./variation-utils";
import { tryPromise, isErr, getErrorMessage } from "@/lib/errors/safe-errors";

/**
 * Dependencies for director image variation handler
 */
export interface DirectorImageVariationHandlerDeps {
  imageModel?: ImageModel;
  isFiboAnalysisEnabled?: boolean;
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
 * Response from director variations API
 */
interface DirectorVariationsResponse {
  refinedPrompts: Array<{
    director: string;
    refinedStructuredPrompt: Record<string, unknown>; // FIBO JSON refined with director's style
  }>;
  fiboAnalysis: unknown;
}

/**
 * Generates director variations (FIBO analysis + director refinement on server)
 * Returns errors as values instead of throwing
 */
async function generateDirectorVariations(
  imageUrl: string,
  directors: string[],
  userContext?: string,
): Promise<DirectorVariationsResponse | Error> {
  const fetchResult = await tryPromise(
    fetch("/api/generate-director-variations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageUrl,
        directors,
        userContext,
      }),
    })
  );

  if (isErr(fetchResult)) {
    return new Error(`Failed to call director variations API: ${getErrorMessage(fetchResult)}`);
  }

  const response = fetchResult;

  if (!response.ok) {
    const errorResult = await tryPromise(response.json());
    const errorMsg = !isErr(errorResult) && errorResult?.error
      ? errorResult.error
      : `Director variations generation failed with status ${response.status}`;
    return new Error(errorMsg);
  }

  const jsonResult = await tryPromise(response.json());

  if (isErr(jsonResult)) {
    return new Error(`Failed to parse director variations response: ${getErrorMessage(jsonResult)}`);
  }

  return jsonResult;
}

/**
 * Generates director-style image variations from a reference image.
 *
 * Process flow:
 * 1. Perform early preparation (pixelated overlay, positioning) for immediate UI feedback
 * 2. Upload/ensure image is in Convex storage
 * 3. Use FIBO to analyze image and get structured prompt
 * 4. Randomly select directors based on variation count
 * 5. Build director text prompts ("Make it look as if it were shot by {director}")
 * 6. Convert FIBO structured prompts to text descriptions
 * 7. Combine FIBO text + director instructions
 * 8. Generate images using Seedream/Nano Banana with combined text prompts
 */
export const handleDirectorImageVariations = async (
  deps: DirectorImageVariationHandlerDeps,
): Promise<void> => {
  const {
    imageModel = config.imageGeneration.defaultModel,
    isFiboAnalysisEnabled = true,
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

  // OPTIMIZATION: Perform early preparation BEFORE async operations
  const preparationResult = await tryPromise(
    performEarlyPreparation(selectedImage, variationCount)
  );

  if (isErr(preparationResult)) {
    handleError(preparationResult.payload, {
      operation: "Director variation preparation",
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

  // Create placeholders IMMEDIATELY for optimistic UI (BEFORE any async operations that can fail)
  const placeholderImages: PlacedImage[] = Array.from(
    { length: variationCount },
    (_, index) => makePlaceholder({}, index),
  );

  setImages((prev) => [...prev, ...placeholderImages]);

  // Stage 0: Upload image to ensure it's in Convex
  const uploadResult = await tryPromise(
    performImageUploadWorkflow({
      selectedImage,
      setActiveGenerations,
      timestamp,
    })
  );

  if (isErr(uploadResult)) {
    handleError(uploadResult.payload, {
      operation: "Director variation upload",
      context: { variationCount, selectedImageId: selectedImage?.id },
    });

    await handleVariationError({
      error: uploadResult.payload,
      selectedImage,
      setActiveGenerations,
      setImages,
      setIsGenerating,
      timestamp,
    });
    return;
  }

  const { signedImageUrl } = uploadResult;

  // Stage 1: Apply pixelated overlay to reference image during analysis
  applyPixelatedOverlayToReferenceImage({
    pixelatedSrc,
    selectedImage,
    setImages,
  });

  const processId = setAnalyzingStatus({
    signedImageUrl,
    setActiveGenerations,
    timestamp,
  });

  // Stage 2: Select random visual stylists (directors or cinematographers)
  const selectedDirectors = selectRandomVisualStylists(variationCount);

  let refinedPrompts: Array<{
    director: string;
    refinedStructuredPrompt?: Record<string, unknown>;
  }> = [];

  if (isFiboAnalysisEnabled) {
    const variationsResult = await generateDirectorVariations(
      signedImageUrl,
      selectedDirectors,
      variationPrompt,
    );

    if (variationsResult instanceof Error) {
      removeAnalyzingStatus(processId, setActiveGenerations);

      handleError(variationsResult, {
        operation: "Director variation generation",
        context: { variationCount, selectedImageId: selectedImage?.id },
      });

      await handleVariationError({
        error: variationsResult,
        selectedImage,
        setActiveGenerations,
        setImages,
        setIsGenerating,
        timestamp,
      });
      return;
    }

    refinedPrompts = variationsResult.refinedPrompts;
  } else {
    // Generate simple prompts locally
    refinedPrompts = selectedDirectors.map((director) => ({
      director,
      // No structured prompt when analysis is disabled
      refinedStructuredPrompt: undefined,
    }));
  }

  // Remove analyzing status
  removeAnalyzingStatus(processId, setActiveGenerations);

  // Stage 4: Update existing placeholders with director metadata
  setImages((prev) =>
    prev.map((img) => {
      // Check if this is one of our variation placeholders
      const match = img.id.match(/^variation-(\d+)-(\d+)$/);
      if (match && parseInt(match[1]) === timestamp) {
        const index = parseInt(match[2]);
        const directorData = refinedPrompts[index];
        if (directorData) {
          return {
            ...img,
            directorName: directorData.director,
            isDirector: true,
          };
        }
      }
      return img;
    }),
  );

  // Stage 5: Set up active generations for Seedream/Nano Banana
  // Convert refined FIBO structured JSON to concise text prompts
  setActiveGenerations((prev) => {
    const newMap = new Map(prev);

    refinedPrompts.forEach((item, index) => {
      const placeholderId = `variation-${timestamp}-${index}`;

      // Convert refined FIBO JSON (with director's style) to text prompt
      // OR use simple text prompt if analysis was disabled
      let finalPrompt = "";

      if (item.refinedStructuredPrompt) {
        finalPrompt = fiboStructuredToText(item.refinedStructuredPrompt);
      } else {
        // Fallback for disabled analysis: Simple prompt construction
        finalPrompt = `Make it look as though it were shot by a film director or cinematographer: ${item.director}.`;
        if (variationPrompt) {
          finalPrompt += ` ${variationPrompt}`;
        }
      }

      newMap.set(placeholderId, {
        imageSize: imageSizeDimensions,
        imageUrl: signedImageUrl,
        isVariation: true,
        model: imageModel,
        prompt: finalPrompt,
        status: VARIATION_STATUS.GENERATING,
      });
    });

    return newMap;
  });

  setIsGenerating(false);
};
