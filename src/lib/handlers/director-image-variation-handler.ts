/**
 * Director Image Variation Handler
 * Orchestrates director-style image generation using FIBO + director refinement
 *
 * @module lib/handlers/director-image-variation-handler
 */

import { selectRandomDirectors } from "@/constants/directors";
import {
  ensureImageInConvex,
  toSignedUrl,
} from "@/features/generation/app-services/image-storage.service";
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
  createPlaceholderFactory,
  performEarlyPreparation,
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
  userContext?: string
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
        `Director variations generation failed with status ${response.status}`
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
  deps: DirectorImageVariationHandlerDeps
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

    // Stage 1: Analyzing + refining placeholder
    const processId = `variation-${timestamp}-process`;
    const processingPlaceholder = makePlaceholder(
      {
        isAnalyzing: true,
        statusMessage: "Analyzing image and applying director styles...",
      },
      0
    );

    setImages((prev) => [...prev, processingPlaceholder]);
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

    // Stage 2: Select random directors
    const selectedDirectors = selectRandomDirectors(variationCount);
    handlerLogger.info("Selected directors", { directors: selectedDirectors });

    // Stage 3: Call API to get FIBO analysis + refined director prompts
    handlerLogger.info("Calling director variations API");
    const { refinedPrompts } = await generateDirectorVariations(
      signedImageUrl,
      selectedDirectors,
      variationPrompt
    );

    // Remove processing placeholder
    setImages((prev) =>
      prev.filter((img) => img.id !== processingPlaceholder.id)
    );
    setActiveGenerations((prev) => {
      const newMap = new Map(prev);
      newMap.delete(processId);
      return newMap;
    });

    // Stage 4: Create generation placeholders with director metadata
    const placeholderImages: PlacedImage[] = refinedPrompts.map((item, index) =>
      makePlaceholder(
        {
          isDirector: true,
          directorName: item.director,
        },
        index
      )
    );

    setImages((prev) => [...prev, ...placeholderImages]);

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
          model: imageModel, // Use selected model (Seedream or Nano Banana)
          prompt: finalPrompt, // Refined prompt converted to text
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
