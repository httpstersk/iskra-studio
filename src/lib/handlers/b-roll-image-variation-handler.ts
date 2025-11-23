/**
 * B-roll Image Variation Handler
 * Generates B-roll image variations from a reference image
 * Uses OpenAI vision analysis to match the reference style
 * Uses errors-as-values pattern with @safe-std/error
 *
 * @module lib/handlers/b-roll-image-variation-handler
 */

import { generateBRollConcepts } from "@/lib/b-roll-concept-generator";
import { DEFAULT_FIBO_ANALYSIS } from "@/constants/fibo";
import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";
import { showErrorFromException } from "@/lib/toast";
import type { PlacedImage } from "@/types/canvas";
import {
  createPlaceholderFactory,
  handleVariationError,
  performEarlyPreparation,
  VARIATION_STATUS,
} from "./variation-shared-utils";
import {
  ensureImageInConvex,
  toSignedUrl,
  validateSingleImageSelection,
} from "./variation-utils";
import { tryPromise, isErr, getErrorMessage } from "@/lib/errors/safe-errors";
import { IMAGE_MODELS, type ImageModelId } from "@/lib/image-models";

/**
 * API endpoints for B-roll generation
 */
const API_ENDPOINTS = {
  ANALYZE_IMAGE: "/api/analyze-image",
} as const;

/**
 * Error messages for B-roll generation
 */
const ERROR_MESSAGES = {
  BROLL_GENERATION_FAILED: "B-roll concept generation failed",
  IMAGE_ANALYSIS_FAILED: "Image analysis failed",
  IMAGE_NOT_FOUND: "The selected image could not be found",
  SELECT_ONE_IMAGE:
    "Please select exactly one image to generate B-roll variations",
} as const;

/**
 * Toast notification properties
 */
interface ToastProps {
  description?: string;
  title: string;
  variant?: "default" | "destructive";
}

/**
 * Dependencies for B-roll image variation handler
 */
interface BrollImageVariationHandlerDeps {
  /** Model to use for image generation */
  imageModel?: ImageModelId;
  /** Whether FIBO analysis is enabled */
  isFiboAnalysisEnabled?: boolean;
  /** Array of all placed images */
  images: PlacedImage[];
  /** IDs of selected images */
  selectedIds: string[];
  /** Setter for active generation states */
  setActiveGenerations: React.Dispatch<
    React.SetStateAction<Map<string, import("@/types/canvas").ActiveGeneration>>
  >;
  /** Setter for images state */
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
  /** Setter for global generating flag */
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  /** Toast notification function */
  toast: (props: ToastProps) => void;
  /** Number of variations to generate (4, 8, or 12) */
  variationCount?: number;
  /** Optional user context/prompt for B-roll */
  variationPrompt?: string;
}

/**
 * Analyzes an image using OpenAI's vision model with structured output.
 * Returns errors as values instead of throwing
 *
 * @param imageUrl - URL of the image to analyze
 * @returns Promise resolving to image style and mood analysis or Error
 */
async function analyzeImageStyle(
  imageUrl: string,
): Promise<ImageStyleMoodAnalysis | Error> {
  const fetchResult = await tryPromise(
    fetch(API_ENDPOINTS.ANALYZE_IMAGE, {
      body: JSON.stringify({ imageUrl }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    })
  );

  if (isErr(fetchResult)) {
    return new Error(`Failed to call image analysis API: ${getErrorMessage(fetchResult)}`);
  }

  const response = fetchResult;

  if (!response.ok) {
    const errorResult = await tryPromise(response.json());
    const errorMsg = !isErr(errorResult) && errorResult?.error
      ? errorResult.error
      : `${ERROR_MESSAGES.IMAGE_ANALYSIS_FAILED} with status ${response.status}`;
    return new Error(errorMsg);
  }

  const jsonResult = await tryPromise(response.json());

  if (isErr(jsonResult)) {
    return new Error(`Failed to parse image analysis response: ${getErrorMessage(jsonResult)}`);
  }

  return jsonResult.analysis;
}

/**
 * Generates B-roll image variations from a reference image.
 *
 * Process flow:
 * 1. Perform early preparation (pixelated overlay, positioning) for immediate UI feedback
 * 2. Upload/ensure image is in Convex storage
 * 3. Analyze the reference image's style, mood, and context
 * 4. Generate contextually relevant B-roll concepts dynamically
 * 5. Create variations that complement the reference while featuring different content
 *
 * @param deps - Handler dependencies including images, state setters, and configuration
 * @returns Promise that resolves when generation is set up
 */
export const handleBrollImageVariations = async (
  deps: BrollImageVariationHandlerDeps,
): Promise<void> => {
  const {
    imageModel = IMAGE_MODELS.SEEDREAM,
    isFiboAnalysisEnabled = true,
    images,
    selectedIds,
    setActiveGenerations,
    setImages,
    setIsGenerating,
    toast: _toast,
    variationCount = 4,
    variationPrompt,
  } = deps;

  // Validate selection early
  const selectedImage = validateSingleImageSelection(images, selectedIds);

  if (!selectedImage) {
    return;
  }

  setIsGenerating(true);

  const timestamp = Date.now();

  // OPTIMIZATION: Perform early preparation BEFORE async operations
  // This generates pixelated overlay immediately for instant visual feedback
  const preparationResult = await tryPromise(
    performEarlyPreparation([selectedImage], variationCount)
  );

  if (isErr(preparationResult)) {
    showErrorFromException(
      "Generation failed",
      preparationResult.payload,
      "Failed to prepare for B-roll variations",
    );

    await handleVariationError({
      error: preparationResult.payload,
      selectedImages: [selectedImage],
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

  // Create placeholders IMMEDIATELY (optimistic UI) BEFORE async operations
  const placeholderImages: PlacedImage[] = Array.from(
    { length: variationCount },
    (_, index) => makePlaceholder({}, index),
  );

  setImages((prev) => [...prev, ...placeholderImages]);

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

  if (imageUrl instanceof Error) {
    showErrorFromException(
      "Upload failed",
      imageUrl,
      "Failed to upload image for B-roll variations",
    );

    // Remove upload placeholder
    setActiveGenerations((prev) => {
      const newMap = new Map(prev);
      newMap.delete(uploadId);
      return newMap;
    });

    await handleVariationError({
      error: imageUrl,
      selectedImages: [selectedImage],
      setActiveGenerations,
      setImages,
      setIsGenerating,
      timestamp,
    });
    return;
  }

  // Remove upload placeholder
  setActiveGenerations((prev) => {
    const newMap = new Map(prev);
    newMap.delete(uploadId);
    return newMap;
  });

  // Convert to signed URL for API calls (handles proxy URLs)
  const signedImageUrl = toSignedUrl(imageUrl);

  if (signedImageUrl instanceof Error) {
    showErrorFromException(
      "URL conversion failed",
      signedImageUrl,
      "Failed to convert image URL for B-roll variations",
    );

    await handleVariationError({
      error: signedImageUrl,
      selectedImages: [selectedImage],
      setActiveGenerations,
      setImages,
      setIsGenerating,
      timestamp,
    });
    return;
  }

  // Stage 1: Analyze image style/mood (if enabled)
  let imageAnalysis: ImageStyleMoodAnalysis | Error;

  if (isFiboAnalysisEnabled) {
    const analyzeId = `variation-${timestamp}-analyze`;

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

    imageAnalysis = await analyzeImageStyle(signedImageUrl);

    // Remove analyze placeholder
    setActiveGenerations((prev) => {
      const newMap = new Map(prev);
      newMap.delete(analyzeId);
      return newMap;
    });
  } else {
    // Use default analysis if disabled
    imageAnalysis = DEFAULT_FIBO_ANALYSIS as unknown as ImageStyleMoodAnalysis;
  }

  if (imageAnalysis instanceof Error) {
    showErrorFromException(
      "Analysis failed",
      imageAnalysis,
      "Failed to analyze image for B-roll variations",
    );

    await handleVariationError({
      error: imageAnalysis,
      selectedImages: [selectedImage],
      setActiveGenerations,
      setImages,
      setIsGenerating,
      timestamp,
    });
    return;
  }

  // Stage 2: Generate B-roll concepts dynamically based on analysis
  const brollResult = await tryPromise(
    generateBRollConcepts({
      count: variationCount,
      styleAnalysis: imageAnalysis,
      userContext: variationPrompt,
    })
  );

  if (isErr(brollResult)) {
    showErrorFromException(
      "Generation failed",
      brollResult.payload,
      ERROR_MESSAGES.BROLL_GENERATION_FAILED,
    );

    await handleVariationError({
      error: brollResult.payload,
      selectedImages: [selectedImage],
      setActiveGenerations,
      setImages,
      setIsGenerating,
      timestamp,
    });
    return;
  }

  const brollConcepts = brollResult;

  // Stage 3: Use generated prompts directly (they're already formatted)
  const formattedPrompts = brollConcepts.concepts;

  // Batch all activeGeneration updates into single state update
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

  // Setup complete - StreamingImage components will handle generation
  setIsGenerating(false);
};
