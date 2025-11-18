/**
 * B-roll Image Variation Handler
 * Generates B-roll image variations from a reference image
 * Uses OpenAI vision analysis to match the reference style
 *
 * @module lib/handlers/b-roll-image-variation-handler
 */

import { generateBRollConcepts } from "@/lib/b-roll-concept-generator";
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
  imageModel?: "seedream" | "nano-banana";
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
 *
 * @param imageUrl - URL of the image to analyze
 * @returns Promise resolving to image style and mood analysis
 * @throws Error if analysis fails
 */
async function analyzeImageStyle(
  imageUrl: string
): Promise<ImageStyleMoodAnalysis> {
  const response = await fetch(API_ENDPOINTS.ANALYZE_IMAGE, {
    body: JSON.stringify({ imageUrl }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.error ||
        `${ERROR_MESSAGES.IMAGE_ANALYSIS_FAILED} with status ${response.status}`
    );
  }

  const result = await response.json();
  return result.analysis;
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
  deps: BrollImageVariationHandlerDeps
): Promise<void> => {
  const {
    imageModel = "seedream",
    images,
    selectedIds,
    setActiveGenerations,
    setImages,
    setIsGenerating,
    toast,
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

  try {
    // OPTIMIZATION: Perform early preparation BEFORE async operations
    // This generates pixelated overlay immediately for instant visual feedback
    const {
      imageSizeDimensions,
      pixelatedSrc,
      positionIndices,
      snappedSource,
    } = await performEarlyPreparation(selectedImage, variationCount);

    // Create factory function with shared configuration for all placeholders
    const makePlaceholder = createPlaceholderFactory({
      imageSizeDimensions,
      pixelatedSrc,
      positionIndices,
      selectedImage,
      snappedSource,
      timestamp,
    });

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

    // Remove upload placeholder
    setActiveGenerations((prev) => {
      const newMap = new Map(prev);
      newMap.delete(uploadId);
      return newMap;
    });

    // Convert to signed URL for API calls (handles proxy URLs)
    const signedImageUrl = toSignedUrl(imageUrl);

    // Stage 1: Analyze image style/mood
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

    const imageAnalysis = await analyzeImageStyle(signedImageUrl);

    // Remove analyze placeholder
    setActiveGenerations((prev) => {
      const newMap = new Map(prev);
      newMap.delete(analyzeId);
      return newMap;
    });

    // Stage 2: Generate B-roll concepts dynamically based on analysis
    const brollConcepts = await generateBRollConcepts({
      count: variationCount,
      styleAnalysis: imageAnalysis,
      userContext: variationPrompt,
    });

    // Stage 3: Use generated prompts directly (they're already formatted)
    const formattedPrompts = brollConcepts.concepts;

    // Create placeholders IMMEDIATELY (optimistic UI)
    const placeholderImages: PlacedImage[] = formattedPrompts.map((_, index) =>
      makePlaceholder({}, index)
    );

    // Add placeholders immediately
    setImages((prev) => [...prev, ...placeholderImages]);

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
  } catch (error) {
    showErrorFromException(
      "Generation failed",
      error,
      ERROR_MESSAGES.BROLL_GENERATION_FAILED
    );

    await handleVariationError({
      selectedImage,
      setActiveGenerations,
      setImages,
      setIsGenerating,
      timestamp,
    });
  }
};
