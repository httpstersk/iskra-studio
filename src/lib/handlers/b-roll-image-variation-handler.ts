/**
 * B-roll Image Variation Handler
 * Generates B-roll image variations from a reference image
 * Uses OpenAI vision analysis to match the reference style
 */

import { generateBRollConcepts } from "@/lib/b-roll-concept-generator";
import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";
import type { PlacedImage } from "@/types/canvas";
import { getOptimalImageDimensions } from "@/utils/image-crop-utils";
import { generateAndCachePixelatedOverlay } from "@/utils/image-pixelation-helper";
import { snapPosition } from "@/utils/snap-utils";
import { calculateBalancedPosition } from "./variation-handler";
import {
  ensureImageInConvex,
  toSignedUrl,
  validateSingleImageSelection,
} from "./variation-utils";

const API_ENDPOINTS = {
  ANALYZE_IMAGE: "/api/analyze-image",
} as const;

const ERROR_MESSAGES = {
  BROLL_GENERATION_FAILED: "B-roll concept generation failed",
  IMAGE_ANALYSIS_FAILED: "Image analysis failed",
  IMAGE_NOT_FOUND: "The selected image could not be found",
  SELECT_ONE_IMAGE:
    "Please select exactly one image to generate B-roll variations",
} as const;

interface ToastProps {
  description?: string;
  title: string;
  variant?: "default" | "destructive";
}

interface BrollImageVariationHandlerDeps {
  images: PlacedImage[];
  selectedIds: string[];
  setActiveGenerations: React.Dispatch<
    React.SetStateAction<Map<string, import("@/types/canvas").ActiveGeneration>>
  >;
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  toast: (props: ToastProps) => void;
  imageModel?: "seedream" | "reve";
  variationCount?: number;
  variationPrompt?: string;
}

/**
 * Analyzes an image using OpenAI's vision model with structured output
 * @param imageUrl - URL of the image to analyze
 * @returns Promise resolving to image style and mood analysis
 * @throws Error if analysis fails
 */
async function analyzeImage(imageUrl: string): Promise<ImageStyleMoodAnalysis> {
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
 * Uses OpenAI to:
 * 1. Analyze the reference image's style, mood, and context
 * 2. Generate contextually relevant B-roll concepts dynamically
 * 3. Create variations that complement the reference while featuring different content
 */
export const handleBrollImageVariations = async (
  deps: BrollImageVariationHandlerDeps
) => {
  const {
    images,
    selectedIds,
    setActiveGenerations,
    setImages,
    setIsGenerating,
    toast,
    imageModel = "seedream",
    variationCount = 4,
    variationPrompt,
  } = deps;

  // Validate selection early
  const selectedImage = validateSingleImageSelection(
    images,
    selectedIds,
    toast
  );

  if (!selectedImage) {
    return;
  }

  setIsGenerating(true);

  // Show analyzing toast
  toast({
    description: "Analyzing style and generating contextual B-roll concepts",
    title: "Analyzing image...",
  });

  try {
    // Ensure image is in Convex (reuses existing URL if already there)
    const imageUrl = await ensureImageInConvex(selectedImage.src, toast);

    // Convert to signed URL for API calls (handles proxy URLs)
    const signedImageUrl = toSignedUrl(imageUrl);

    // Stage 1: Analyze image style/mood
    const imageAnalysis = await analyzeImage(signedImageUrl);

    // Stage 2: Generate B-roll concepts dynamically based on analysis
    toast({
      description: "Creating contextually relevant B-roll concepts",
      title: "Generating concepts...",
    });

    const brollConcepts = await generateBRollConcepts({
      count: variationCount,
      styleAnalysis: imageAnalysis,
      userContext: variationPrompt,
    });

    // Stage 3: Use generated prompts directly (they're already formatted)
    const formattedPrompts = brollConcepts.concepts;

    // Snap source position for consistent alignment
    const snappedSource = snapPosition(selectedImage.x, selectedImage.y);
    const timestamp = Date.now();

    // Position indices based on variation count
    let positionIndices: number[];

    if (variationCount === 4) {
      positionIndices = [0, 2, 4, 6];
    } else if (variationCount === 8) {
      positionIndices = [0, 1, 2, 3, 4, 5, 6, 7];
    } else {
      positionIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    }

    // Get optimal dimensions for variations
    const imageSizeDimensions = getOptimalImageDimensions(
      selectedImage.width,
      selectedImage.height
    );

    // Generate pixelated overlay from source image for immediate visual feedback
    const pixelatedSrc = await generateAndCachePixelatedOverlay(selectedImage);

    // Create placeholders IMMEDIATELY (optimistic UI)
    const placeholderImages: PlacedImage[] = formattedPrompts.map(
      (_, index) => {
        const positionIndex = positionIndices[index];
        const position = calculateBalancedPosition(
          snappedSource.x,
          snappedSource.y,
          positionIndex,
          selectedImage.width,
          selectedImage.height,
          selectedImage.width,
          selectedImage.height
        );

        return {
          displayAsThumbnail: true,
          height: selectedImage.height,
          id: `variation-${timestamp}-${index}`,
          isGenerated: true,
          isLoading: true,
          naturalHeight: imageSizeDimensions.height,
          naturalWidth: imageSizeDimensions.width,
          rotation: 0,
          src: selectedImage.src,
          pixelatedSrc,
          width: selectedImage.width,
          x: position.x,
          y: position.y,
        };
      }
    );

    // Add placeholders immediately
    setImages((prev) => [...prev, ...placeholderImages]);

    // Batch all activeGeneration updates into single state update
    setActiveGenerations((prev) => {
      const newMap = new Map(prev);
      formattedPrompts.forEach((formattedPrompt, index) => {
        const placeholderId = `variation-${timestamp}-${index}`;

        newMap.set(placeholderId, {
          imageUrl: signedImageUrl,
          prompt: formattedPrompt,
          isVariation: true,
          imageSize: imageSizeDimensions,
          model: imageModel,
        });
      });

      return newMap;
    });

    // Show generation started toast
    toast({
      description: `Creating ${variationCount} contextually relevant B-roll images`,
      title: "Generating B-roll variations",
    });

    // Setup complete - StreamingImage components will handle generation
    setIsGenerating(false);
  } catch (error) {
    console.error("Error generating B-roll image variations:", error);

    toast({
      description:
        error instanceof Error
          ? error.message
          : ERROR_MESSAGES.BROLL_GENERATION_FAILED,
      title: "Generation failed",
      variant: "destructive",
    });

    setIsGenerating(false);
  }
};
