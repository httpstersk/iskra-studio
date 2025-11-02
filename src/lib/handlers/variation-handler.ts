/**
 * Camera Angles Image Variation Handler
 * Generates image variations with different camera angles and perspectives
 *
 * @module lib/handlers/variation-handler
 */

import {
  formatImageVariationPrompt,
  getRandomCinematographerReference,
  getRandomDirectorReference,
  getRandomRecompositionStyle,
} from "@/lib/prompt-formatters/image-variation-prompt-formatter";
import { showError, showErrorFromException } from "@/lib/toast";
import type { PlacedImage } from "@/types/canvas";
import { selectRandomCameraVariations } from "@/utils/camera-variation-utils";
import type { FalClient } from "@fal-ai/client";
import {
  createPlaceholderFactory,
  performEarlyPreparation,
  VARIATION_STATUS,
} from "./variation-shared-utils";
import {
  ensureImageInConvex,
  toSignedUrl,
  validateSingleImageSelection,
} from "./variation-utils";

/**
 * Dependencies for variation generation handler
 */
interface VariationHandlerDeps {
  /** Fal AI client instance */
  falClient: FalClient;
  /** Model to use for image generation */
  imageModel?: "seedream" | "nano-banana";
  /** Type of image variation (camera-angles or director) */
  imageVariationType?: "camera-angles" | "director";
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
    React.SetStateAction<Map<string, any>>
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

// Re-export calculateBalancedPosition from shared utilities for backwards compatibility
export { calculateBalancedPosition } from "./variation-shared-utils";

/**
 * Handle variation generation for a selected image
 * Generates variations with different camera settings based on count
 * Images: 4, 8, or 12 variations
 * Videos: always 4 variations (sides only) using Sora 2
 * Optimized for maximum performance and UX
 */
export const handleVariationGeneration = async (deps: VariationHandlerDeps) => {
  const {
    images,
    falClient,
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
    imageModel = "seedream",
    variationPrompt,
    videoSettings,
    viewport,
  } = deps;

  // Route to appropriate handler based on variation mode:
  // - Video mode: Uses Sora 2 with AI analysis (image analysis + storyline generation)
  // - Image mode with director: Uses Seedream/Nano Banana with FIBO analysis + director style refinement
  // - Image mode with camera angles: Uses Seedream without AI analysis (continues below)
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
      selectedIds,
      setActiveVideoGenerations,
      setIsGenerating,
      setVideos,
      userId,
      videoSettings,
      viewport,
    });
  }

  // IMAGE MODE with director: Generate director-style variations using FIBO + refinement
  if (variationMode === "image" && imageVariationType === "director") {
    const { handleDirectorImageVariations } = await import(
      "./director-image-variation-handler"
    );

    return handleDirectorImageVariations({
      images,
      selectedIds,
      setActiveGenerations,
      setImages,
      setIsGenerating,
      imageModel,
      variationCount: variationCount as 4 | 8 | 12,
      variationPrompt,
    });
  }

  // IMAGE MODE: Generate variations using Seedream (no AI analysis)
  // This path is taken when variationMode === "image"

  // Validate selection early
  const selectedImage = validateSingleImageSelection(images, selectedIds);
  if (!selectedImage) {
    return;
  }

  setIsGenerating(true);

  const timestamp = Date.now();

  // OPTIMIZATION: Perform early preparation BEFORE async operations
  // This generates pixelated overlay immediately for instant visual feedback
  const { imageSizeDimensions, pixelatedSrc, positionIndices, snappedSource } =
    await performEarlyPreparation(selectedImage, variationCount);

  // Randomly select camera variations from the expanded set
  // Position indices are assigned sequentially based on variation count:
  // 4 variations: cardinal directions (0, 2, 4, 6)
  // 8 variations: all 8 positions (0-7)
  // 12 variations: inner ring (0-7) + outer cardinal directions (8-11)
  const variationsToGenerate = selectRandomCameraVariations(variationCount);

  // Create factory function with shared configuration for all placeholders
  const makePlaceholder = createPlaceholderFactory({
    imageSizeDimensions,
    pixelatedSrc,
    positionIndices,
    selectedImage,
    snappedSource,
    timestamp,
  });

  // Create placeholders IMMEDIATELY (optimistic UI)
  const placeholderImages: PlacedImage[] = variationsToGenerate.map(
    (_, index) => makePlaceholder({}, index),
  );

  // Add placeholders immediately - single state update
  setImages((prev) => [...prev, ...placeholderImages]);

  try {
    // Stage 0: Uploading image to ensure it's in Convex
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

    // OPTIMIZATION 4: Batch all activeGeneration updates into single state update
    // Convert proxy URL to signed URL for tRPC (imageUrl could be proxy or full Convex URL)
    const signedImageUrl = toSignedUrl(imageUrl);

    setActiveGenerations((prev) => {
      const newMap = new Map(prev);

      variationsToGenerate.forEach((cameraDirective, index) => {
        const placeholderId = `variation-${timestamp}-${index}`;
        const recompositionStyle = getRandomRecompositionStyle();
        const directorReference = getRandomDirectorReference();
        const cinematographerReference = getRandomCinematographerReference();
        const formattedPrompt = formatImageVariationPrompt(
          cameraDirective,
          variationPrompt,
          {
            cinematographerReference,
            directorReference,
            outputFormat: "singleline",
            recompositionStyle,
          },
        );

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
    // Clean up placeholders on error
    const placeholderIds = placeholderImages.map((img) => img.id);
    setImages((prev) => prev.filter((img) => !placeholderIds.includes(img.id)));

    showErrorFromException(
      "Generation failed",
      error,
      "Failed to generate variations",
    );

    setIsGenerating(false);
  }
};
