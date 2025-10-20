/**
 * B-roll Image Variation Handler
 * Generates B-roll image variations from a reference image
 * Uses OpenAI vision analysis to match the reference style
 */

import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";
import type { PlacedImage } from "@/types/canvas";
import { selectRandomBrollVariations } from "@/utils/b-roll-variation-utils";
import { getOptimalImageDimensions } from "@/utils/image-crop-utils";
import { snapPosition } from "@/utils/snap-utils";
import { formatBrollVariationPrompt } from "@/lib/prompt-formatters/b-roll-variation-prompt-formatter";
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
  IMAGE_ANALYSIS_FAILED: "Image analysis failed",
  IMAGE_NOT_FOUND: "The selected image could not be found",
  SELECT_ONE_IMAGE: "Please select exactly one image to generate B-roll variations",
} as const;

interface ToastProps {
  description?: string;
  title: string;
  variant?: "default" | "destructive";
}

interface BrollImageVariationHandlerDeps {
  images: PlacedImage[];
  selectedIds: string[];
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveGenerations: React.Dispatch<
    React.SetStateAction<Map<string, import("@/types/canvas").ActiveGeneration>>
  >;
  toast: (props: ToastProps) => void;
  userId?: string;
  variationPrompt?: string;
  variationCount?: number;
  viewport: { x: number; y: number; scale: number };
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
 * Generates B-roll image variations from a reference image
 * Uses OpenAI analysis to match the reference style
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
    userId,
    variationCount = 4,
    variationPrompt,
    viewport,
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
    title: "Analyzing image style...",
    description: "Preparing B-roll variations that match your reference image",
  });

  try {
    // Ensure image is in Convex (reuses existing URL if already there)
    const imageUrl = await ensureImageInConvex(selectedImage.src, toast);

    // Stage 1: Analyze image style/mood
    const imageAnalysis = await analyzeImage(imageUrl);

    // Stage 2: Select random B-roll variations
    const brollDirectives = selectRandomBrollVariations(variationCount);

    // Stage 3: Format prompts with style analysis
    const formattedPrompts = brollDirectives.map((directive) =>
      formatBrollVariationPrompt(directive, imageAnalysis, variationPrompt)
    );

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
          rotation: 0,
          src: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
          width: selectedImage.width,
          x: position.x,
          y: position.y,
          naturalWidth: imageSizeDimensions.width,
          naturalHeight: imageSizeDimensions.height,
        };
      }
    );

    // Add placeholders immediately
    setImages((prev) => [...prev, ...placeholderImages]);

    // Convert proxy URL to signed URL for tRPC
    const signedImageUrl = toSignedUrl(imageUrl);

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
        });
      });

      return newMap;
    });

    // Show generation started toast
    toast({
      title: "Generating B-roll variations",
      description: `Creating ${variationCount} AI-analyzed B-roll images...`,
    });

    // Setup complete - StreamingImage components will handle generation
    setIsGenerating(false);
  } catch (error) {
    console.error("Error generating B-roll image variations:", error);

    toast({
      description:
        error instanceof Error
          ? error.message
          : "Failed to generate B-roll variations",
      title: "Generation failed",
      variant: "destructive",
    });

    setIsGenerating(false);
  }
};
