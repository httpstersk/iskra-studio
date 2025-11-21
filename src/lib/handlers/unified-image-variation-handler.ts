/**
 * Unified Image Variation Handler
 * Generic handler for all image variation types (director, camera angle, lighting)
 * Uses configuration-driven approach for DRY code
 *
 * @module lib/handlers/unified-image-variation-handler
 */

import {
  mapImageVariationType,
  variationClientConfigs,
  type ImageVariationType,
  type VariationClientConfig,
  type VariationType,
} from "@/lib/api/variation-api-helper";
import { getErrorMessage, isErr, tryPromise } from "@/lib/errors/safe-errors";
import { fiboStructuredToText } from "@/lib/utils/fibo-to-text";
import { handleError } from "@/shared/errors";
import type { ActiveGeneration, PlacedImage } from "@/types/canvas";
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
import type { ImageModelId } from "@/lib/image-models";

/**
 * Dependencies for unified image variation handler
 */
export interface UnifiedImageVariationHandlerDeps {
  /** Model to use for image generation */
  imageModel: ImageModelId;
  /** Whether FIBO analysis is enabled */
  isFiboAnalysisEnabled: boolean;
  /** Array of all placed images */
  images: PlacedImage[];
  /** IDs of selected images */
  selectedIds: string[];
  /** Setter for active generation states */
  setActiveGenerations: React.Dispatch<
    React.SetStateAction<Map<string, ActiveGeneration>>
  >;
  /** Setter for images state */
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
  /** Setter for global generating flag */
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  /** Number of variations to generate (4, 8, or 12) */
  variationCount: number;
  /** Optional user prompt for variation context */
  variationPrompt?: string;
}

/**
 * Response from variation API endpoints
 */
interface VariationsApiResponse {
  refinedPrompts: Array<{
    [key: string]: string | Record<string, unknown>;
    refinedStructuredPrompt: Record<string, unknown>;
  }>;
  fiboAnalysis: unknown;
}

/**
 * Generic API call function for all variation types
 * Replaces the 3 near-identical functions in previous implementation
 */
async function fetchVariationsFromApi(
  config: VariationClientConfig,
  imageUrl: string,
  items: string[],
  userContext?: string
): Promise<VariationsApiResponse | Error> {
  const fetchResult = await tryPromise(
    fetch(config.apiEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl,
        [config.apiRequestKey]: items,
        userContext,
      }),
    })
  );

  if (isErr(fetchResult)) {
    return new Error(
      `Failed to call ${config.displayName} variations API: ${getErrorMessage(fetchResult)}`
    );
  }

  const response = fetchResult;

  if (!response.ok) {
    const errorResult = await tryPromise(response.json());
    const errorMsg =
      !isErr(errorResult) && errorResult?.error
        ? errorResult.error
        : `${config.displayName} variations generation failed with status ${response.status}`;
    return new Error(errorMsg);
  }

  const jsonResult = await tryPromise(response.json());

  if (isErr(jsonResult)) {
    return new Error(
      `Failed to parse ${config.displayName} variations response: ${getErrorMessage(jsonResult)}`
    );
  }

  return jsonResult;
}

/**
 * Unified handler for all image variation types
 * Uses configuration from variationClientConfigs to handle any variation type
 */
export async function handleUnifiedImageVariation(
  variationType: VariationType,
  deps: UnifiedImageVariationHandlerDeps
): Promise<void> {
  const config = variationClientConfigs[variationType];
  const {
    imageModel,
    isFiboAnalysisEnabled,
    images,
    selectedIds,
    setActiveGenerations,
    setImages,
    setIsGenerating,
    variationCount,
    variationPrompt,
  } = deps;

  // Validate selection early
  const selectedImage = validateSingleImageSelection(images, selectedIds);
  if (!selectedImage) return;

  setIsGenerating(true);
  const timestamp = Date.now();

  // Stage 0: Early preparation (pixelated overlay, positioning)
  const preparationResult = await tryPromise(
    performEarlyPreparation(selectedImage, variationCount)
  );

  if (isErr(preparationResult)) {
    handleError(preparationResult.payload, {
      operation: `${config.displayName} variation preparation`,
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

  const { imageSizeDimensions, pixelatedSrc, positionIndices, snappedSource } =
    preparationResult;

  // Select random items for this variation type
  const selectedItems = config.selectRandomItems(variationCount);

  // Create placeholder factory with shared configuration
  const makePlaceholder = createPlaceholderFactory({
    imageSizeDimensions,
    pixelatedSrc,
    positionIndices,
    selectedImage,
    snappedSource,
    timestamp,
  });

  // Create placeholders with type-specific metadata
  const placeholderImages: PlacedImage[] = selectedItems.map((item, index) =>
    makePlaceholder(config.getPlaceholderMeta(item), index)
  );

  setImages((prev) => [...prev, ...placeholderImages]);

  // Stage 1: Upload image to Convex
  const uploadResult = await tryPromise(
    performImageUploadWorkflow({
      selectedImage,
      setActiveGenerations,
      timestamp,
    })
  );

  if (isErr(uploadResult)) {
    handleError(uploadResult.payload, {
      operation: `${config.displayName} variation upload`,
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

  // Stage 2: Apply pixelated overlay to reference image during analysis
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

  // Stage 3: Get refined prompts (from API or generate locally)
  let refinedPrompts: Array<{
    item: string;
    refinedStructuredPrompt?: Record<string, unknown>;
  }> = [];

  if (isFiboAnalysisEnabled) {
    const variationsResult = await fetchVariationsFromApi(
      config,
      signedImageUrl,
      selectedItems,
      variationPrompt
    );

    if (variationsResult instanceof Error) {
      removeAnalyzingStatus(processId, setActiveGenerations);

      handleError(variationsResult, {
        operation: `${config.displayName} variation generation`,
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

    // Transform API response to normalized format
    refinedPrompts = variationsResult.refinedPrompts.map((prompt) => ({
      item: prompt[config.responseItemKey] as string,
      refinedStructuredPrompt: prompt.refinedStructuredPrompt,
    }));
  } else {
    // FIBO disabled: use items without structured prompts
    refinedPrompts = selectedItems.map((item) => ({
      item,
      refinedStructuredPrompt: undefined,
    }));
  }

  // Remove analyzing status
  removeAnalyzingStatus(processId, setActiveGenerations);

  // Stage 4: Update placeholders with additional metadata (if config specifies)
  if (config.getImageMeta) {
    setImages((prev) =>
      prev.map((img) => {
        const match = img.id.match(/^variation-(\d+)-(\d+)$/);
        if (match && parseInt(match[1]) === timestamp) {
          const index = parseInt(match[2]);
          const promptData = refinedPrompts[index];
          if (promptData) {
            return { ...img, ...config.getImageMeta!(promptData.item) };
          }
        }
        return img;
      })
    );
  }

  // Stage 5: Set up active generations with final prompts
  setActiveGenerations((prev) => {
    const newMap = new Map(prev);

    refinedPrompts.forEach((promptData, index) => {
      const placeholderId = `variation-${timestamp}-${index}`;

      // Build final prompt: use FIBO structured if available, else use buildPrompt
      const finalPrompt = promptData.refinedStructuredPrompt
        ? fiboStructuredToText(promptData.refinedStructuredPrompt)
        : config.buildPrompt(promptData.item, variationPrompt);

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
}

/**
 * Convenience wrapper that accepts ImageVariationType (from UI)
 * and converts to internal VariationType
 */
export async function handleImageVariationByType(
  imageVariationType: ImageVariationType,
  deps: UnifiedImageVariationHandlerDeps
): Promise<void> {
  const variationType = mapImageVariationType(imageVariationType);
  return handleUnifiedImageVariation(variationType, deps);
}
