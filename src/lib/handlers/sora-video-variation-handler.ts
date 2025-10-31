/**
 * Sora 2 Video Variation Handler
 * Generates 4 cinematic video variations from a reference image using Sora 2 model
 * with AI-generated prompts based on image analysis
 */

import { VIDEO_DEFAULTS } from "@/constants/canvas";
import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";
import { showError, showErrorFromException } from "@/lib/toast";
import { expandStorylinesToPrompts } from "@/lib/sora-prompt-generator";
import { generateStorylines } from "@/lib/storyline-generator";
import type {
  PlacedImage,
  PlacedVideo,
  VideoGenerationSettings,
} from "@/types/canvas";
import {
  createVideoPlaceholder,
  performEarlyPreparation,
  VARIATION_STATUS,
} from "./variation-shared-utils";
import {
  ensureImageInConvex,
  toSignedUrl,
  validateSingleImageSelection,
} from "./variation-utils";

// Constants
const API_ENDPOINTS = {
  ANALYZE_IMAGE: "/api/analyze-image",
} as const;

const ERROR_MESSAGES = {
  IMAGE_ANALYSIS_FAILED: "Image analysis failed",
  IMAGE_NOT_FOUND: "The selected image could not be found",
  RATE_LIMIT_EXCEEDED: "Rate limit exceeded",
  SELECT_ONE_IMAGE:
    "Please select exactly one image to generate video variations",
  UPLOAD_FAILED: "Upload failed",
} as const;

const HTTP_STATUS = {
  RATE_LIMIT: 429,
} as const;

const VARIATION_COUNT = 4;
const POSITION_INDICES = [0, 2, 4, 6] as const;

interface ToastProps {
  description?: string;
  title: string;
  variant?: "default" | "destructive";
}

interface VideoGenerationConfig {
  duration: number;
  imageUrl: string;
  isVariation: true;
  modelId: string;
  prompt: string;
  sourceImageId: string;
  [key: string]: unknown;
}

interface SoraVideoVariationHandlerDeps {
  basePrompt?: string;
  images: PlacedImage[];
  selectedIds: string[];
  setActiveVideoGenerations: React.Dispatch<
    React.SetStateAction<Map<string, VideoGenerationConfig>>
  >;
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  setVideos: React.Dispatch<React.SetStateAction<PlacedVideo[]>>;
  userId?: string;
  videoSettings?: Partial<VideoGenerationSettings>;
  viewport: { x: number; y: number; scale: number };
}

/**
 * Analyzes an image using OpenAI's vision model with structured output
 * @param imageUrl - URL of the image to analyze
 * @returns Promise resolving to image style and mood analysis
 * @throws Error if analysis fails
 */
async function analyzeImage(imageUrl: string): Promise<ImageStyleMoodAnalysis> {
  // Validate URL before sending to API
  if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
    throw new Error(
      `Invalid image URL for analysis: must be a full URL, got: ${imageUrl.substring(0, 100)}`
    );
  }

  const response = await fetch(API_ENDPOINTS.ANALYZE_IMAGE, {
    body: JSON.stringify({ imageUrl }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);

    // Include validation details in the error message
    const errorMsg = error?.details
      ? `${error.error}: ${JSON.stringify(error.details)} (URL: ${imageUrl.substring(0, 100)})`
      : error?.error ||
        `${ERROR_MESSAGES.IMAGE_ANALYSIS_FAILED} with status ${response.status}`;

    throw new Error(errorMsg);
  }

  const result = await response.json();
  return result.analysis;
}

/**
 * Parses duration from video settings
 * @param duration - Duration value from settings (string, number, or undefined)
 * @returns Parsed duration as number (defaults to 8)
 */
function parseDuration(duration: string | number | undefined): number {
  if (typeof duration === "string") {
    return parseInt(duration, 10);
  }
  if (typeof duration === "number") {
    return duration;
  }
  return 8;
}



interface CreateVideoGenerationConfigParams {
  duration: number;
  imageUrl: string;
  modelId: string;
  prompt: string;
  sourceImageId: string;
  videoSettings: Partial<VideoGenerationSettings>;
}

/**
 * Creates video generation configuration object
 * @param params - Configuration parameters
 * @param params.prompt - Video generation prompt
 * @param params.imageUrl - Reference image URL
 * @param params.modelId - Model ID to use
 * @param params.duration - Video duration
 * @param params.sourceImageId - Source image ID
 * @param params.videoSettings - Additional video settings
 * @returns Video generation configuration
 */
function createVideoGenerationConfig(
  params: CreateVideoGenerationConfigParams
): VideoGenerationConfig {
  const { duration, imageUrl, modelId, prompt, sourceImageId, videoSettings } =
    params;

  // Extract prompt from videoSettings to prevent overwriting our variation prompt
  const { prompt: _unusedPrompt, ...restVideoSettings } =
    videoSettings as Record<string, unknown>;

  return {
    aspectRatio: videoSettings.aspectRatio || "auto",
    duration,
    imageUrl,
    isVariation: true,
    modelId,
    prompt,
    resolution: videoSettings.resolution || "auto",
    sourceImageId,
    ...restVideoSettings, // Spread remaining settings without prompt
  };
}

/**
 * Generates 4 cinematic video variations from a reference image using Sora 2
 */
export const handleSoraVideoVariations = async (
  deps: SoraVideoVariationHandlerDeps
) => {
  const {
    images,
    selectedIds,
    setActiveVideoGenerations,
    setIsGenerating,
    setVideos,
    userId,
    videoSettings = {},
  } = deps;

  const selectedImage = validateSingleImageSelection(images, selectedIds);
  if (!selectedImage) {
    return;
  }

  setIsGenerating(true);

  const timestamp = Date.now();

  try {
    // Check if user is authenticated
    if (!userId) {
      showError(
        "Authentication required",
        "Please sign in to generate video variations"
      );
      setIsGenerating(false);
      return;
    }

    // OPTIMIZATION: Perform early preparation BEFORE async operations
    // This generates pixelated overlay immediately for instant visual feedback
    const { pixelatedSrc, snappedSource, positionIndices } =
      await performEarlyPreparation(selectedImage, VARIATION_COUNT);

    // Stage 0: Uploading image to ensure it's in Convex
    const uploadId = `video-${timestamp}-upload`;

    setActiveVideoGenerations((prev) => {
      const newMap = new Map(prev);
      newMap.set(uploadId, {
        imageUrl: "",
        prompt: "",
        status: VARIATION_STATUS.UPLOADING,
        isVariation: true,
        duration: parseDuration(videoSettings.duration),
        modelId: videoSettings.modelId || VIDEO_DEFAULTS.MODEL_ID,
        sourceImageId: selectedIds[0],
      });
      return newMap;
    });

    const sourceImageUrl = selectedImage.fullSizeSrc || selectedImage.src;

    // Validate source URL before processing
    if (!sourceImageUrl || sourceImageUrl.length === 0) {
      throw new Error("Source image URL is missing or empty");
    }

    const imageUrl = await ensureImageInConvex(sourceImageUrl);

    // Remove upload placeholder
    setActiveVideoGenerations((prev) => {
      const newMap = new Map(prev);
      newMap.delete(uploadId);
      return newMap;
    });

    // Convert proxy URL to signed URL for API
    const signedImageUrl = toSignedUrl(imageUrl);

    // Validate the signed URL before making API calls
    if (
      !signedImageUrl.startsWith("http://") &&
      !signedImageUrl.startsWith("https://")
    ) {
      throw new Error(
        `Invalid signed URL format: Expected full URL but got: ${signedImageUrl.substring(0, 100)}`
      );
    }

    // Stage 1: Analyze image style/mood
    const analyzeId = `video-${timestamp}-analyze`;

    setActiveVideoGenerations((prev) => {
      const newMap = new Map(prev);
      newMap.set(analyzeId, {
        imageUrl: signedImageUrl,
        prompt: "",
        status: VARIATION_STATUS.ANALYZING,
        isVariation: true,
        duration: parseDuration(videoSettings.duration),
        modelId: videoSettings.modelId || VIDEO_DEFAULTS.MODEL_ID,
        sourceImageId: selectedIds[0],
      });
      return newMap;
    });

    const imageAnalysis = await analyzeImage(signedImageUrl);

    // Remove analyze placeholder
    setActiveVideoGenerations((prev) => {
      const newMap = new Map(prev);
      newMap.delete(analyzeId);
      return newMap;
    });

    // Stage 2: Generate storyline concepts using AI
    const duration = parseDuration(videoSettings.duration);

    const storylineSet = await generateStorylines({
      styleAnalysis: imageAnalysis,
      duration,
    });

    // Stage 3: Expand storylines into full Sora prompts
    const videoPrompts = expandStorylinesToPrompts(
      storylineSet.storylines,
      imageAnalysis,
      duration
    );

    // Create video placeholders immediately for optimistic UI
    const videoPlaceholders = videoPrompts.map((_, index) =>
      createVideoPlaceholder({
        duration,
        pixelatedSrc,
        positionIndex: positionIndices[index],
        sourceHeight: selectedImage.height,
        sourceImageId: selectedIds[0],
        sourceWidth: selectedImage.width,
        sourceX: snappedSource.x,
        sourceY: snappedSource.y,
        timestamp,
        variationIndex: index,
      })
    );

    // Add placeholders to canvas
    setVideos((prev) => [...prev, ...videoPlaceholders]);

    // Determine model ID based on Pro setting
    const modelId = videoSettings.modelId || VIDEO_DEFAULTS.MODEL_ID;

    // Set up active video generations
    setActiveVideoGenerations((prev) => {
      const newMap = new Map(prev);

      videoPrompts.forEach((variationPrompt, index) => {
        const videoId = `sora-video-${timestamp}-${index}`;

        const config = createVideoGenerationConfig({
          duration,
          imageUrl: signedImageUrl,
          modelId,
          prompt: variationPrompt,
          sourceImageId: selectedIds[0],
          videoSettings,
        });

        newMap.set(videoId, {
          ...config,
          status: VARIATION_STATUS.GENERATING,
        });
      });

      return newMap;
    });

    setIsGenerating(false);
  } catch (error) {
    showErrorFromException(
      "Generation failed",
      error,
      "Failed to generate video variations"
    );

    setIsGenerating(false);
  }
};
