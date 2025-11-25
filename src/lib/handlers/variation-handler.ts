/**
 * Variation Handler Router
 * Routes variation requests to appropriate handlers based on mode and type
 *
 * @module lib/handlers/variation-handler
 */

import { IMAGE_MODELS, type ImageModelId } from "@/lib/image-models";
import { showError } from "@/lib/toast";
import type { PlacedImage } from "@/types/canvas";
import {
  handleImageVariationByType,
  type UnifiedImageVariationHandlerDeps,
} from "./unified-image-variation-handler";

// Re-export for backwards compatibility
export { calculateBalancedPosition } from "./variation-shared-utils";

/**
 * Dependencies for variation generation handler
 */
interface VariationHandlerDeps {
  /** Model to use for image generation */
  imageModel?: ImageModelId;
  /** Type of image variation (camera-angles, director, or lighting) */
  imageVariationType?:
    | "camera-angles"
    | "director"
    | "lighting"
    | "storyline"
    | "characters"
    | "emotions"
    | "surface";
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
  /** Setter for active video generation states */
  setActiveVideoGenerations?: React.Dispatch<
    React.SetStateAction<
      Map<string, import("@/types/canvas").ActiveVideoGeneration>
    >
  >;
  /** Setter for images state */
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
  /** Setter for global generating flag */
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  /** Setter for videos state */
  setVideos?: React.Dispatch<
    React.SetStateAction<import("@/types/canvas").PlacedVideo[]>
  >;
  /** User ID for convex operations */
  userId?: string;
  /** Number of variations to generate (4, 8, or 12) */
  variationCount?: number;
  /** Mode of variation (image or video) */
  variationMode?: "image" | "video";
  /** Optional user prompt for variation */
  variationPrompt?: string;
  /** Video generation settings */
  videoSettings?: import("@/types/canvas").VideoGenerationSettings;
  /** Current viewport state */
  viewport: { x: number; y: number; scale: number };
}

/**
 * Handle variation generation for a selected image
 * Routes to appropriate handler based on variation mode and type
 *
 * - Video mode: Uses Sora 2 with AI analysis
 * - Image mode: Uses unified handler for all variation types (director, camera angles, lighting)
 */
export const handleVariationGeneration = async (
  deps: VariationHandlerDeps,
): Promise<void> => {
  const {
    images,
    selectedIds,
    setActiveGenerations,
    setActiveVideoGenerations,
    setImages,
    setIsGenerating,
    setVideos,
    userId,
    variationCount = 4,
    variationMode = "image",
    imageVariationType = "camera-angles",
    imageModel = IMAGE_MODELS.SEEDREAM,
    isFiboAnalysisEnabled = true,
    variationPrompt,
    videoSettings,
    viewport,
  } = deps;

  // VIDEO MODE: Route to Sora video handler
  if (variationMode === "video") {
    if (!setVideos || !setActiveVideoGenerations) {
      showError(
        "Configuration error",
        "Video generation handlers not available",
      );
      return;
    }

    const { handleSoraVideoVariations } = await import(
      "./sora-video-variation-handler"
    );

    return handleSoraVideoVariations({
      basePrompt: variationPrompt,
      images,
      isFiboAnalysisEnabled,
      selectedIds,
      setActiveVideoGenerations,
      setIsGenerating,
      setVideos,
      userId,
      videoSettings,
      viewport,
    });
  }

  // IMAGE MODE: Route to unified image variation handler
  const unifiedDeps: UnifiedImageVariationHandlerDeps = {
    imageModel,
    isFiboAnalysisEnabled,
    images,
    selectedIds,
    setActiveGenerations,
    setImages,
    setIsGenerating,
    variationCount,
    variationPrompt,
  };

  return handleImageVariationByType(imageVariationType, unifiedDeps);
};
