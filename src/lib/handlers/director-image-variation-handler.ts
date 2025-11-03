/**
 * Director Image Variation Handler
 * Orchestrates director-style image generation using FIBO + director refinement
 *
 * @module lib/handlers/director-image-variation-handler
 */

import { selectRandomDirectors } from "@/constants/directors";
import { fiboStructuredToText } from "@/lib/utils/fibo-to-text";
import {
  config,
  type ImageModel,
  type VariationCount,
} from "@/shared/config/runtime";
import { handleError } from "@/shared/errors";
import { logger } from "@/shared/logging/logger";
import type { PlacedImage } from "@/types/canvas";
import {
  applyPixelatedOverlayToReferenceImage,
  createPlaceholderFactory,
  performEarlyPreparation,
  performImageUploadWorkflow,
  removeAnalyzingStatus,
  setAnalyzingStatus,
  VARIATION_STATUS,
} from "./variation-shared-utils";
import { validateSingleImageSelection } from "./variation-utils";

const handlerLogger = logger.child({ handler: "director-image-variation" });

/**
 * Dependencies for director image variation handler
 */
export interface DirectorImageVariationHandlerDeps {
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
 * Response from director variations API
 */
interface DirectorVariationsResponse {
  refinedPrompts: Array<{
    director: string;
    refinedStructuredPrompt: any; // FIBO JSON refined with director's style
  }>;
  fiboAnalysis: any;
}

/**
 * Generates director variations (FIBO analysis + director refinement on server)
 */
async function generateDirectorVariations(
  imageUrl: string,
  directors: string[],
  userContext?: string,
): Promise<DirectorVariationsResponse> {
  const response = await fetch("/api/generate-director-variations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      imageUrl,
      directors,
      userContext,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.error ||
        `Director variations generation failed with status ${response.status}`,
    );
  }

  return response.json();
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
    // OPTIMIZATION: Perform early preparation BEFORE async operations
    const {
      imageSizeDimensions,
      pixelatedSrc,
      positionIndices,
      snappedSource,
    } = await performEarlyPreparation(selectedImage, variationCount);

    // Stage 0: Upload image to ensure it's in Convex
    const { signedImageUrl } = await performImageUploadWorkflow({
      selectedImage,
      setActiveGenerations,
      timestamp,
    });

    // Create factory function with shared configuration for all placeholders
    const makePlaceholder = createPlaceholderFactory({
      imageSizeDimensions,
      pixelatedSrc,
      positionIndices,
      selectedImage,
      snappedSource,
      timestamp,
    });

    // Create placeholders IMMEDIATELY for optimistic UI
    const placeholderImages: PlacedImage[] = Array.from(
      { length: variationCount },
      (_, index) => makePlaceholder({}, index),
    );

    setImages((prev) => [...prev, ...placeholderImages]);

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

    // Stage 2: Select random directors
    const selectedDirectors = selectRandomDirectors(variationCount);
    handlerLogger.info("Selected directors", { directors: selectedDirectors });

    // Stage 3: Call API to get FIBO analysis + refined director prompts
    handlerLogger.info("Calling director variations API");
    const { refinedPrompts } = await generateDirectorVariations(
      signedImageUrl,
      selectedDirectors,
      variationPrompt,
    );

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
        const finalPrompt = fiboStructuredToText(item.refinedStructuredPrompt);

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

    handlerLogger.info("Director variations setup complete", {
      directorCount: refinedPrompts.length,
    });

    setIsGenerating(false);
  } catch (error) {
    handlerLogger.error("Director variation handler failed", error as Error);
    handleError(error, {
      operation: "Director variation generation",
      context: { variationCount, selectedImageId: selectedImage?.id },
    });

    setIsGenerating(false);
  }
};
