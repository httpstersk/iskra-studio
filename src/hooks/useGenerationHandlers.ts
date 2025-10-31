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

/**
 * Generation handler dependencies
 */
interface GenerationHandlerDeps {
  canvasSize: { height: number; width: number };
  falClient: any;
  generateTextToImage: any;
  generationCount: number;
  generationSettings: GenerationSettings;
  imageModel: "seedream" | "nano-banana";
  imageVariationType: "camera-angles" | "storyline";
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
  useSoraPro: boolean;
  userId: string | null;
  variationMode: "image" | "video";
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
    falClient,
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
    useSoraPro,
    userId,
    variationMode,
    videoDuration,
    videoResolution,
    viewport,
  } = deps;

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
    ]
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
      selectedIds.length === 1 &&
      (variationMode === "image" || variationMode === "video");

    if (isVariationMode) {
      // Sanitize prompt to ensure we don't pass empty strings to the API
      // For video mode, server will generate a prompt if none provided
      const sanitizedPrompt = sanitizePrompt(
        generationSettings.variationPrompt
      );

      await handleVariationGeneration({
        falClient,
        imageModel,
        imageVariationType,
        images,
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
          aspectRatio: "auto",
          duration: videoDuration,
          modelId: useSoraPro ? "sora-2-pro" : "sora-2",
          prompt: sanitizedPrompt || "", // Empty string will trigger AI generation on server
          resolution: videoResolution,
        },
        viewport,
      });
    } else {
      await handleRunHandler({
        canvasSize,
        falClient,
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
    falClient,
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
    setSelectedIds,
    setShowSignInPrompt,
    setVideos,
    useSoraPro,
    userId,
    variationMode,
    videoDuration,
    videoResolution,
    viewport,
  ]);

  return {
    handleConvertToVideo,
    handleRun,
  };
}
