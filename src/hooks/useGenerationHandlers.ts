import { handleRun as handleRunHandler } from "@/lib/handlers/generation-handler";
import { handleVariationGeneration } from "@/lib/handlers/variation-handler";
import { sanitizePrompt } from "@/lib/prompt-utils";
import type { Viewport } from "@/store/canvas-atoms";
import type {
  ActiveGeneration,
  ActiveVideoGeneration,
  GenerationSettings,
  PlacedImage,
  PlacedVideo,
} from "@/types/canvas";
import { useCallback } from "react";
import { useProjectGuard } from "./useProjectGuard";
import type { ImageModelId } from "@/lib/image-models";
import { isFiboAnalysisEnabledAtom } from "@/store/ui-atoms";
import { useAtomValue } from "jotai";

/**
 * Generation handler dependencies
 */
interface GenerationHandlerDeps {
  canvasSize: { height: number; width: number };
  generateTextToImage: (params: {
    prompt: string;
    seed?: number;
    imageSize?:
    | "square"
    | "landscape_16_9"
    | "portrait_16_9"
    | "landscape_4_3"
    | "portrait_4_3"
    | { width: number; height: number };
  }) => Promise<{ url: string; width: number; height: number; seed: number }>;
  generationCount: number;
  generationSettings: GenerationSettings;
  imageModel: ImageModelId;
  imageVariationType: "camera-angles" | "director" | "lighting" | "storyline" | "characters";
  images: PlacedImage[];
  isAuthenticated: boolean;
  selectedIds: string[];
  setActiveGenerations: React.Dispatch<
    React.SetStateAction<Map<string, ActiveGeneration>>
  >;
  setActiveVideoGenerations: React.Dispatch<
    React.SetStateAction<Map<string, ActiveVideoGeneration>>
  >;
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  setIsImageToVideoDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setSelectedImageForVideo: React.Dispatch<React.SetStateAction<string | null>>;
  setShowSignInPrompt: React.Dispatch<React.SetStateAction<boolean>>;
  setVideos: React.Dispatch<React.SetStateAction<PlacedVideo[]>>;
  userId: string | null;
  variationMode: "image" | "video";
  videoModel: "sora-2" | "sora-2-pro" | "veo-3.1" | "veo-3.1-pro";
  videoDuration: number | string;
  videoResolution: "auto" | "480p" | "720p" | "1080p";
  viewport: Viewport;
}

/**
 * Custom hook for managing generation-related handlers
 *
 * Encapsulates logic for:
 * - Text-to-image generation
 * - Image/video variation generation
 * - Image-to-video conversion
 * - Authentication guards
 *
 * @param deps - Generation handler dependencies
 * @returns Generation handler functions
 */
export function useGenerationHandlers(deps: GenerationHandlerDeps) {
  const {
    canvasSize,
    generateTextToImage,
    generationCount,
    generationSettings,
    imageModel,
    imageVariationType,
    images,
    isAuthenticated,
    selectedIds,
    setActiveGenerations,
    setActiveVideoGenerations,
    setImages,
    setIsGenerating,
    setIsImageToVideoDialogOpen,
    setSelectedIds,
    setSelectedImageForVideo,
    setShowSignInPrompt,
    setVideos,
    userId,
    variationMode,
    videoDuration,
    videoModel,
    videoResolution,
    viewport,
  } = deps;

  const isFiboAnalysisEnabled = useAtomValue(isFiboAnalysisEnabledAtom);

  const { ensureProject } = useProjectGuard();

  /**
   * Handles image-to-video conversion
   */
  const handleConvertToVideo = useCallback(
    (imageId: string) => {
      if (!isAuthenticated) {
        setShowSignInPrompt(true);
        return;
      }

      const image = images.find((img) => img.id === imageId);
      if (!image) return;
      setIsImageToVideoDialogOpen(true);
      setSelectedImageForVideo(imageId);
    },
    [
      images,
      isAuthenticated,
      setIsImageToVideoDialogOpen,
      setSelectedImageForVideo,
      setShowSignInPrompt,
    ],
  );

  /**
   * Handles generation execution (text-to-image or variations)
   */
  const handleRun = useCallback(async () => {
    if (!isAuthenticated) {
      setShowSignInPrompt(true);
      return;
    }

    // Auto-create project if user has no active project
    await ensureProject();

    const isVariationMode =
      (selectedIds.length === 1 || selectedIds.length === 2) &&
      (variationMode === "image" || variationMode === "video");

    if (isVariationMode) {
      // Sanitize prompt to ensure we don't pass empty strings to the API
      // For video mode, server will generate a prompt if none provided
      const sanitizedPrompt = sanitizePrompt(
        generationSettings.variationPrompt,
      );

      // Normalize video settings based on model
      // VEO models don't support "auto" - use defaults if "auto" is selected
      const isVeoModel = videoModel.startsWith("veo");
      const normalizedAspectRatio = isVeoModel ? "16:9" : "auto";
      const normalizedResolution =
        isVeoModel && videoResolution === "auto" ? "720p" : videoResolution;

      await handleVariationGeneration({
        imageModel,
        imageVariationType,
        images,
        isFiboAnalysisEnabled,
        selectedIds,
        setActiveGenerations,
        setActiveVideoGenerations,
        setImages,
        setIsGenerating,
        setVideos,
        userId: userId ?? undefined,
        variationCount: generationCount,
        variationMode,
        variationPrompt: sanitizedPrompt,
        videoSettings: {
          aspectRatio: normalizedAspectRatio,
          duration: videoDuration,
          modelId: videoModel,
          prompt: sanitizedPrompt || "", // Empty string will trigger AI generation on server
          resolution: normalizedResolution,
        },
        viewport,
      });
    } else {
      await handleRunHandler({
        canvasSize,
        generateTextToImage,
        generationSettings,
        images,
        selectedIds,
        setActiveGenerations,
        setImages,
        setIsGenerating,
        setSelectedIds,
        viewport,
      });
    }
  }, [
    canvasSize,
    ensureProject,
    generateTextToImage,
    generationCount,
    generationSettings,
    imageModel,
    imageVariationType,
    images,
    isAuthenticated,
    isFiboAnalysisEnabled,
    selectedIds,
    setActiveGenerations,
    setActiveVideoGenerations,
    setImages,
    setIsGenerating,
    setSelectedIds,
    setShowSignInPrompt,
    setVideos,
    userId,
    variationMode,
    videoDuration,
    videoModel,
    videoResolution,
    viewport,
  ]);

  return {
    handleConvertToVideo,
    handleRun,
  };
}
