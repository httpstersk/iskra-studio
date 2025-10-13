/**
 * Sora 2 Video Variation Handler
 * Generates 4 cinematic video variations from a reference image using Sora 2 model
 * with AI-generated prompts based on image analysis
 */

import { VIDEO_DEFAULTS } from "@/constants/canvas";
import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";
import { expandStorylinesToPrompts } from "@/lib/sora-prompt-generator";
import { generateStorylines } from "@/lib/storyline-generator";
import type {
  PlacedImage,
  PlacedVideo,
  VideoGenerationSettings,
} from "@/types/canvas";
import { snapPosition } from "@/utils/snap-utils";
import { calculateBalancedPosition } from "./variation-handler";

// Constants
const API_ENDPOINTS = {
  ANALYZE_IMAGE: "/api/analyze-image",
  FAL_UPLOAD: "/api/fal/upload",
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

const IMAGE_CONFIG = {
  CROSS_ORIGIN: "anonymous",
  FILE_NAME: "image.png",
  MIME_TYPE: "image/png",
  QUALITY: 0.95,
} as const;

const TOAST_MESSAGES = {
  EXPANDING_PROMPTS: "Building shot-by-shot sequences...",
  GENERATING_STORYLINES: "Creating unique cinematic narratives...",
  PREPARING_IMAGE: "Uploading reference image...",
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
  falClient: { storage: { upload: (blob: Blob) => Promise<string> } };
  images: PlacedImage[];
  selectedIds: string[];
  setActiveVideoGenerations: React.Dispatch<
    React.SetStateAction<Map<string, VideoGenerationConfig>>
  >;
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  setVideos: React.Dispatch<React.SetStateAction<PlacedVideo[]>>;
  toast: (props: ToastProps) => void;
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
 * Checks if an error is a rate limit error
 * @param error - Error to check
 * @returns True if error is rate limit related
 */
function isRateLimitError(error: unknown): boolean {
  const errorObj = error as { message?: string; status?: number };
  return (
    errorObj.status === HTTP_STATUS.RATE_LIMIT ||
    errorObj.message?.includes("429") ||
    errorObj.message?.includes("rate limit") ||
    false
  );
}

/**
 * Uploads an image blob to fal.ai storage
 * @param blob - Image blob to upload
 * @param toast - Toast notification function
 * @returns Promise resolving to uploaded image URL
 * @throws Error if upload fails
 */
async function uploadImageToFal(
  blob: Blob,
  toast: (props: ToastProps) => void
): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("file", blob, IMAGE_CONFIG.FILE_NAME);

    const response = await fetch(API_ENDPOINTS.FAL_UPLOAD, {
      body: formData,
      method: "POST",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message ||
          `${ERROR_MESSAGES.UPLOAD_FAILED} with status ${response.status}`
      );
    }

    const result = await response.json();
    return result.url;
  } catch (error: unknown) {
    if (isRateLimitError(error)) {
      toast({
        description: "Please try again later.",
        title: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
        variant: "destructive",
      });
    } else {
      toast({
        description: error instanceof Error ? error.message : "Unknown error",
        title: ERROR_MESSAGES.UPLOAD_FAILED,
        variant: "destructive",
      });
    }
    throw error;
  }
}

/**
 * Loads an image from a source URL
 * @param imageSrc - Source URL of the image
 * @returns Promise resolving to loaded HTMLImageElement
 */
function loadImage(imageSrc: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = IMAGE_CONFIG.CROSS_ORIGIN;
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });
}

/**
 * Converts a canvas to a blob
 * @param canvas - Canvas element to convert
 * @returns Promise resolving to blob
 */
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob"));
        }
      },
      IMAGE_CONFIG.MIME_TYPE,
      IMAGE_CONFIG.QUALITY
    );
  });
}

/**
 * Converts an image to a blob
 * @param imageSrc - Source URL of the image
 * @returns Promise resolving to image blob
 * @throws Error if conversion fails
 */
async function imageToBlob(imageSrc: string): Promise<Blob> {
  const img = await loadImage(imageSrc);

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  ctx.drawImage(img, 0, 0);

  return canvasToBlob(canvas);
}

interface ValidateSelectionParams {
  images: PlacedImage[];
  selectedIds: string[];
  toast: (props: ToastProps) => void;
}

/**
 * Validates that exactly one image is selected
 * @param params - Validation parameters
 * @param params.images - Array of placed images
 * @param params.selectedIds - Array of selected image IDs
 * @param params.toast - Toast notification function
 * @returns Selected image or undefined if validation fails
 */
function validateSelection(
  params: ValidateSelectionParams
): PlacedImage | undefined {
  const { images, selectedIds, toast } = params;

  if (selectedIds.length !== 1) {
    toast({
      description: ERROR_MESSAGES.SELECT_ONE_IMAGE,
      title: "Select one image",
      variant: "destructive",
    });
    return undefined;
  }

  const selectedImage = images.find((img) => img.id === selectedIds[0]);
  if (!selectedImage) {
    toast({
      description: ERROR_MESSAGES.IMAGE_NOT_FOUND,
      title: "Image not found",
      variant: "destructive",
    });
    return undefined;
  }

  return selectedImage;
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

interface CreateVideoPlaceholdersParams {
  duration: number;
  selectedImage: PlacedImage;
  timestamp: number;
  videoPrompts: string[];
}

/**
 * Creates video placeholder objects for optimistic UI
 * @param params - Placeholder creation parameters
 * @param params.videoPrompts - Array of video prompts
 * @param params.selectedImage - Source image for positioning
 * @param params.duration - Video duration
 * @param params.timestamp - Timestamp for unique IDs
 * @returns Array of video placeholders
 */
function createVideoPlaceholders(
  params: CreateVideoPlaceholdersParams
): PlacedVideo[] {
  const { duration, selectedImage, timestamp, videoPrompts } = params;
  const snappedSource = snapPosition(selectedImage.x, selectedImage.y);

  return videoPrompts.map((promptText, index) => {
    const positionIndex = POSITION_INDICES[index];
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
      currentTime: VIDEO_DEFAULTS.CURRENT_TIME,
      duration,
      height: selectedImage.height,
      id: `sora-video-${timestamp}-${index}`,
      isLoading: true,
      isLooping: VIDEO_DEFAULTS.IS_LOOPING,
      isPlaying: VIDEO_DEFAULTS.IS_PLAYING,
      isVideo: true as const,
      muted: VIDEO_DEFAULTS.MUTED,
      rotation: 0,
      src: "", // Will be filled when generation completes
      volume: VIDEO_DEFAULTS.VOLUME,
      width: selectedImage.width,
      x: position.x,
      y: position.y,
    };
  });
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
    falClient,
    setVideos,
    setIsGenerating,
    setActiveVideoGenerations,
    toast,
    basePrompt = "",
    videoSettings = {},
  } = deps;

  const selectedImage = validateSelection({ images, selectedIds, toast });
  if (!selectedImage) {
    return;
  }

  setIsGenerating(true);

  try {
    // Upload the reference image
    toast({
      description: TOAST_MESSAGES.PREPARING_IMAGE,
      title: "Preparing image",
    });

    const selectedImageBlob = await imageToBlob(selectedImage.src);
    const imageUrl = await uploadImageToFal(selectedImageBlob, toast);

    // Stage 1: Analyze image style/mood
    const imageAnalysis = await analyzeImage(imageUrl);
    console.log("[Sora Variations] Stage 1: Image analysis completed:", {
      colorPalette: imageAnalysis.colorPalette.dominant,
      mood: imageAnalysis.mood.primary,
      energy: imageAnalysis.mood.energy,
      aesthetics: imageAnalysis.visualStyle.aesthetic,
    });

    toast({
      description: TOAST_MESSAGES.GENERATING_STORYLINES,
      title: "Generating storylines",
    });

    // Stage 2: Generate storyline concepts using AI
    const duration = parseDuration(videoSettings.duration);

    console.log(
      "[Sora Variations] Using duration:",
      duration,
      "from settings:",
      videoSettings.duration
    );

    const storylineSet = await generateStorylines({
      styleAnalysis: imageAnalysis,
      duration,
    });

    console.log("[Sora Variations] Stage 2: Generated storylines:", {
      count: storylineSet.storylines.length,
      styleTheme: storylineSet.styleTheme,
      titles: storylineSet.storylines.map((s) => s.title),
    });

    toast({
      description: TOAST_MESSAGES.EXPANDING_PROMPTS,
      title: "Expanding into prompts",
    });

    // Stage 3: Expand storylines into full Sora prompts
    const videoPrompts = expandStorylinesToPrompts(
      storylineSet.storylines,
      imageAnalysis,
      duration
    );

    console.log("[Sora Variations] Stage 3: Expanded prompts:", {
      promptCount: videoPrompts.length,
      avgLength: Math.round(
        videoPrompts.reduce((sum, p) => sum + p.length, 0) / videoPrompts.length
      ),
    });

    // Create video placeholders immediately for optimistic UI
    const timestamp = Date.now();
    const videoPlaceholders = createVideoPlaceholders({
      duration,
      selectedImage,
      timestamp,
      videoPrompts,
    });

    // Add placeholders to canvas
    setVideos((prev) => [...prev, ...videoPlaceholders]);

    // Determine model ID based on Pro setting
    const modelId = videoSettings.modelId || VIDEO_DEFAULTS.MODEL_ID;
    const modelName = modelId === "sora-2-pro" ? "Sora 2 Pro" : "Sora 2";

    console.log("[Sora Variations] Using model:", {
      modelId,
      modelName,
      duration,
    });

    // Show generation started toast
    toast({
      title: "Generating video variations",
      description: `Creating 4 AI-analyzed cinematic videos with ${modelName} (${duration}s each)...`,
    });

    // Set up active video generations
    setActiveVideoGenerations((prev) => {
      const newMap = new Map(prev);

      videoPrompts.forEach((variationPrompt, index) => {
        const videoId = `sora-video-${timestamp}-${index}`;

        // Use the AI-generated variation prompt based on image analysis
        console.log(`[Sora Variation ${index}] Setting AI-generated prompt:`, {
          promptLength: variationPrompt.length,
          promptPreview: variationPrompt.substring(0, 150),
        });

        const config = createVideoGenerationConfig({
          duration,
          imageUrl,
          modelId,
          prompt: variationPrompt,
          sourceImageId: selectedIds[0],
          videoSettings,
        });

        newMap.set(videoId, config);
      });

      return newMap;
    });

    setIsGenerating(false);
  } catch (error) {
    console.error("Error generating Sora video variations:", error);

    toast({
      description:
        error instanceof Error
          ? error.message
          : "Failed to generate video variations",
      title: "Generation failed",
      variant: "destructive",
    });

    setIsGenerating(false);
  }
};
