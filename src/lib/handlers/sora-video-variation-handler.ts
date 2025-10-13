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

interface SoraVideoVariationHandlerDeps {
  images: PlacedImage[];
  selectedIds: string[];
  viewport: { x: number; y: number; scale: number };
  falClient: { storage: { upload: (blob: Blob) => Promise<string> } };
  setVideos: React.Dispatch<React.SetStateAction<PlacedVideo[]>>;
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  setIsApiKeyDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveVideoGenerations: React.Dispatch<
    React.SetStateAction<Map<string, any>>
  >;
  toast: (props: {
    title: string;
    description?: string;
    variant?: "default" | "destructive";
  }) => void;
  customApiKey?: string;
  basePrompt?: string;
  videoSettings?: Partial<VideoGenerationSettings>;
}

/**
 * Analyzes an image using OpenAI's vision model with structured output
 */
async function analyzeImage(imageUrl: string): Promise<ImageStyleMoodAnalysis> {
  const response = await fetch("/api/analyze-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imageUrl }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.error || `Image analysis failed with status ${response.status}`,
    );
  }

  const result = await response.json();
  return result.analysis;
}

/**
 * Uploads an image blob to fal.ai storage
 */
async function uploadImageToFal(
  blob: Blob,
  customApiKey: string | undefined,
  toast: SoraVideoVariationHandlerDeps["toast"],
  setIsApiKeyDialogOpen: SoraVideoVariationHandlerDeps["setIsApiKeyDialogOpen"],
): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("file", blob, "image.png");

    const response = await fetch("/api/fal/upload", {
      method: "POST",
      body: formData,
      headers: customApiKey ? { authorization: `Bearer ${customApiKey}` } : {},
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.message || `Upload failed with status ${response.status}`,
      );
    }

    const result = await response.json();
    return result.url;
  } catch (error: unknown) {
    const isRateLimit =
      (error as { status?: number; message?: string }).status === 429 ||
      (error as { message?: string }).message?.includes("429") ||
      (error as { message?: string }).message?.includes("rate limit");

    if (isRateLimit) {
      toast({
        title: "Rate limit exceeded",
        description: "Add your FAL API key to bypass rate limits.",
        variant: "destructive",
      });
      setIsApiKeyDialogOpen(true);
    } else {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
    throw error;
  }
}

/**
 * Converts an image to a blob
 */
async function imageToBlob(imageSrc: string): Promise<Blob> {
  const img = new window.Image();
  img.crossOrigin = "anonymous";
  img.src = imageSrc;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
  });

  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  ctx.drawImage(img, 0, 0);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      },
      "image/png",
      0.95,
    );
  });
}

/**
 * Generates 4 cinematic video variations from a reference image using Sora 2
 */
export const handleSoraVideoVariations = async (
  deps: SoraVideoVariationHandlerDeps,
) => {
  const {
    images,
    selectedIds,
    falClient,
    setVideos,
    setIsGenerating,
    setIsApiKeyDialogOpen,
    setActiveVideoGenerations,
    toast,
    customApiKey,
    basePrompt = "",
    videoSettings = {},
  } = deps;

  // Validate selection
  if (selectedIds.length !== 1) {
    toast({
      title: "Select one image",
      description:
        "Please select exactly one image to generate video variations",
      variant: "destructive",
    });
    return;
  }

  const selectedImage = images.find((img) => img.id === selectedIds[0]);
  if (!selectedImage) {
    toast({
      title: "Image not found",
      description: "The selected image could not be found",
      variant: "destructive",
    });
    return;
  }

  setIsGenerating(true);

  try {
    // Upload the reference image
    toast({
      title: "Preparing image",
      description: "Uploading reference image...",
    });

    const blob = await imageToBlob(selectedImage.src);
    const imageUrl = await uploadImageToFal(
      blob,
      customApiKey,
      toast,
      setIsApiKeyDialogOpen,
    );

    // Stage 1: Analyze image style/mood
    const imageAnalysis = await analyzeImage(imageUrl);
    console.log("[Sora Variations] Stage 1: Image analysis completed:", {
      colorPalette: imageAnalysis.colorPalette.dominant,
      mood: imageAnalysis.mood.primary,
      energy: imageAnalysis.mood.energy,
      aesthetics: imageAnalysis.visualStyle.aesthetic,
    });

    toast({
      title: "Generating storylines",
      description: "Creating unique cinematic narratives...",
    });

    // Stage 2: Generate storyline concepts using AI
    const duration =
      typeof videoSettings.duration === "string"
        ? parseInt(videoSettings.duration, 10)
        : typeof videoSettings.duration === "number"
          ? videoSettings.duration
          : 8;

    console.log(
      "[Sora Variations] Using duration:",
      duration,
      "from settings:",
      videoSettings.duration,
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
      title: "Expanding into prompts",
      description: "Building shot-by-shot sequences...",
    });

    // Stage 3: Expand storylines into full Sora prompts
    const videoPrompts = expandStorylinesToPrompts(
      storylineSet.storylines,
      imageAnalysis,
      duration,
    );

    console.log("[Sora Variations] Stage 3: Expanded prompts:", {
      promptCount: videoPrompts.length,
      avgLength: Math.round(
        videoPrompts.reduce((sum, p) => sum + p.length, 0) /
          videoPrompts.length,
      ),
    });

    // Create video placeholders immediately for optimistic UI
    const timestamp = Date.now();
    const snappedSource = snapPosition(selectedImage.x, selectedImage.y);

    // Position indices for 4 variations: top, right, bottom, left
    const positionIndices = [0, 2, 4, 6];

    const videoPlaceholders: PlacedVideo[] = videoPrompts.map(
      (promptText, index) => {
        const positionIndex = positionIndices[index];
        const position = calculateBalancedPosition(
          snappedSource.x,
          snappedSource.y,
          positionIndex,
          selectedImage.width,
          selectedImage.height,
          selectedImage.width,
          selectedImage.height,
        );

        return {
          id: `sora-video-${timestamp}-${index}`,
          src: "", // Will be filled when generation completes
          x: position.x,
          y: position.y,
          width: selectedImage.width,
          height: selectedImage.height,
          rotation: 0,
          isVideo: true as const,
          duration,
          currentTime: VIDEO_DEFAULTS.CURRENT_TIME,
          isPlaying: VIDEO_DEFAULTS.IS_PLAYING,
          isLooping: VIDEO_DEFAULTS.IS_LOOPING,
          volume: VIDEO_DEFAULTS.VOLUME,
          muted: VIDEO_DEFAULTS.MUTED,
          isLoading: true,
        };
      },
    );

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

        // Extract prompt from videoSettings to prevent overwriting our variation prompt
        const { prompt: _unusedPrompt, ...restVideoSettings } =
          videoSettings as any;

        newMap.set(videoId, {
          imageUrl,
          prompt: variationPrompt,
          modelId,
          resolution: videoSettings.resolution || "auto",
          aspectRatio: videoSettings.aspectRatio || "auto",
          duration,
          sourceImageId: selectedIds[0],
          isVariation: true,
          ...restVideoSettings, // Spread remaining settings without prompt
        });
      });

      return newMap;
    });

    setIsGenerating(false);
  } catch (error) {
    console.error("Error generating Sora video variations:", error);

    toast({
      title: "Generation failed",
      description:
        error instanceof Error
          ? error.message
          : "Failed to generate video variations",
      variant: "destructive",
    });

    setIsGenerating(false);
  }
};
