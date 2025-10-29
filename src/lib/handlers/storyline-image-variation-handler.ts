/**
 * Storyline Image Variation Handler
 * Generates storyline image sequences from a reference image with exponential time progression
 * Uses OpenAI vision analysis to match the reference style with enhanced coherence
 */

import { generateStorylineImageConcepts } from "@/lib/storyline-image-generator";
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
  STORYLINE_GENERATION_FAILED: "Storyline generation failed",
  IMAGE_ANALYSIS_FAILED: "Image analysis failed",
  IMAGE_NOT_FOUND: "The selected image could not be found",
  SELECT_ONE_IMAGE:
    "Please select exactly one image to generate storyline sequence",
} as const;

interface ToastProps {
  description?: string;
  title: string;
  variant?: "default" | "destructive";
}

interface StorylineImageVariationHandlerDeps {
  images: PlacedImage[];
  selectedIds: string[];
  setActiveGenerations: React.Dispatch<
    React.SetStateAction<Map<string, import("@/types/canvas").ActiveGeneration>>
  >;
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
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
 * Generates storyline image variations from a reference image.
 *
 * Uses OpenAI to:
 * 1. Analyze the reference image's style, mood, and context with enhanced precision
 * 2. Generate narrative storyline concepts with exponential time progression
 * 3. Create variations that continue the story with exact visual coherence
 */
export const handleStorylineImageVariations = async (
  deps: StorylineImageVariationHandlerDeps
) => {
  const {
    images,
    selectedIds,
    setActiveGenerations,
    setImages,
    setIsGenerating,
    imageModel = "seedream",
    variationCount = 4,
    variationPrompt,
  } = deps;

  // Validate selection early
  const selectedImage = validateSingleImageSelection(
    images,
    selectedIds
  );

  if (!selectedImage) {
    return;
  }

  setIsGenerating(true);

  const timestamp = Date.now();

  try {
    // Stage 0: Uploading image to ensure it's in Convex
    const placeholderId = `variation-${timestamp}-upload`;

    setActiveGenerations((prev) => {
      const newMap = new Map(prev);
      newMap.set(placeholderId, {
        imageUrl: "",
        prompt: "",
        status: "uploading",
        isVariation: true,
      });
      return newMap;
    });

    const sourceImageUrl = selectedImage.fullSizeSrc || selectedImage.src;
    const imageUrl = await ensureImageInConvex(sourceImageUrl);

    // Remove upload placeholder
    setActiveGenerations((prev) => {
      const newMap = new Map(prev);
      newMap.delete(placeholderId);
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
        prompt: "",
        status: "analyzing",
        isVariation: true,
      });
      return newMap;
    });

    const imageAnalysis = await analyzeImage(signedImageUrl);

    // Remove analyze placeholder
    setActiveGenerations((prev) => {
      const newMap = new Map(prev);
      newMap.delete(analyzeId);
      return newMap;
    });

    // Stage 2: Generate storyline concepts with exponential time progression
    const storylineId = `variation-${timestamp}-storyline`;

    setActiveGenerations((prev) => {
      const newMap = new Map(prev);
      newMap.set(storylineId, {
        imageUrl: signedImageUrl,
        prompt: "",
        status: "creating-storyline",
        isVariation: true,
      });
      return newMap;
    });

    const storylineConcepts = await generateStorylineImageConcepts({
      count: variationCount,
      styleAnalysis: imageAnalysis,
      userContext: variationPrompt,
    });

    // Remove storyline placeholder
    setActiveGenerations((prev) => {
      const newMap = new Map(prev);
      newMap.delete(storylineId);
      return newMap;
    });

    // Stage 3: Extract prompts and metadata
    const formattedPrompts = storylineConcepts.concepts.map((c) => c.prompt);
    const timeLabels = storylineConcepts.concepts.map((c) => c.timeLabel);
    const narrativeNotes = storylineConcepts.concepts.map(
      (c) => c.narrativeNote
    );

    // Snap source position for consistent alignment
    const snappedSource = snapPosition(selectedImage.x, selectedImage.y);

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
          // Store storyline metadata
          metadata: {
            timeLabel: timeLabels[index],
            narrativeNote: narrativeNotes[index],
            isStoryline: true,
          },
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
          status: "generating",
        });
      });

      return newMap;
    });

    // Setup complete - StreamingImage components will handle generation
    setIsGenerating(false);
  } catch (error) {
    console.error("Error generating storyline image variations:", error);
    setIsGenerating(false);
  }
};
