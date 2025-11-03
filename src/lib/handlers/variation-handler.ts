/**
 * Camera Angles Image Variation Handler
 * Generates image variations with different camera angles and perspectives
 *
 * @module lib/handlers/variation-handler
 */

import { analyzeFiboImage } from "@/lib/services/fibo-image-analyzer";
import { showError, showErrorFromException } from "@/lib/toast";
import { fiboStructuredToText } from "@/lib/utils/fibo-to-text";
import { logger } from "@/shared/logging/logger";
import type { PlacedImage } from "@/types/canvas";
import { selectRandomCameraVariations } from "@/utils/camera-variation-utils";
import {
  applyPixelatedOverlayToReferenceImage,
  createPlaceholderFactory,
  performEarlyPreparation,
  performImageUploadWorkflow,
  removeAnalyzingStatus,
  setAnalyzingStatus,
  VARIATION_STATUS,
} from "./variation-shared-utils";
import { validateSingleImageSelection } from "./variation-utils";

/**
 * Dependencies for variation generation handler
 */
interface VariationHandlerDeps {
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

  // IMAGE MODE with camera-angles: Generate camera angle variations using FIBO analysis
  // This path is taken when variationMode === "image" and imageVariationType === "camera-angles"

  const handlerLogger = logger.child({ handler: "camera-angle-variation" });

  // Validate selection early
  const selectedImage = validateSingleImageSelection(images, selectedIds);
  if (!selectedImage) {
    return;
  }

  setIsGenerating(true);
  const timestamp = Date.now();

  // OPTIMIZATION: Perform early preparation BEFORE async operations
  const { imageSizeDimensions, pixelatedSrc, positionIndices, snappedSource } =
    await performEarlyPreparation(selectedImage, variationCount);

  // Randomly select camera directives (no duplicates via Fisher-Yates)
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

  // Create placeholders IMMEDIATELY with cameraAngle metadata
  const placeholderImages: PlacedImage[] = variationsToGenerate.map(
    (cameraDirective, index) =>
      makePlaceholder({ cameraAngle: cameraDirective }, index),
  );

  // Add placeholders immediately - single state update
  setImages((prev) => [...prev, ...placeholderImages]);

  try {
    // Stage 0: Upload image to Convex
    const { signedImageUrl } = await performImageUploadWorkflow({
      selectedImage,
      setActiveGenerations,
      timestamp,
    });

    // Stage 1: FIBO analysis with graceful fallback
    let fiboText: string | null = null;

    try {
      // Apply pixelated overlay during analysis
      applyPixelatedOverlayToReferenceImage({
        pixelatedSrc,
        selectedImage,
        setImages,
      });

      const processId = setAnalyzingStatus({
        signedImageUrl,
        setActiveGenerations,
        timestamp,
      });

      handlerLogger.info("Starting FIBO analysis for camera angles");

      // Analyze image with FIBO
      const fiboStructuredPrompt = await analyzeFiboImage({
        imageUrl: signedImageUrl,
      });

      // Convert FIBO structured prompt to text
      fiboText = fiboStructuredToText(fiboStructuredPrompt);

      handlerLogger.info("FIBO analysis complete", {
        hasResult: !!fiboText,
      });

      // Remove analyzing status
      removeAnalyzingStatus(processId, setActiveGenerations);
    } catch (fiboError) {
      // Log FIBO failure but continue with fallback
      handlerLogger.warn(
        "FIBO analysis failed, using direct-to-model fallback",
        fiboError as Error,
      );
      fiboText = null;
    }

    // Stage 2: Generate images with refined prompts (FIBO + camera directive)
    setActiveGenerations((prev) => {
      const newMap = new Map(prev);

      variationsToGenerate.forEach((cameraDirective, index) => {
        const placeholderId = `variation-${timestamp}-${index}`;

        // Build prompt: FIBO text + camera directive, or just camera directive if FIBO failed
        let finalPrompt: string;

        if (fiboText) {
          // FIBO succeeded - combine FIBO analysis with camera directive
          finalPrompt = `${fiboText}\n\nApply this camera angle: ${cameraDirective}`;
          handlerLogger.info("Using FIBO-powered prompt", { index });
        } else {
          // FIBO failed - fallback to direct camera directive
          finalPrompt = cameraDirective;
          if (variationPrompt) {
            finalPrompt = `${variationPrompt}\n\n${cameraDirective}`;
          }
          handlerLogger.info("Using direct-to-model fallback", { index });
        }

        newMap.set(placeholderId, {
          imageSize: imageSizeDimensions,
          imageUrl: signedImageUrl,
          isVariation: true,
          model: imageModel,
          prompt: finalPrompt,
          status: VARIATION_STATUS.GENERATING,
        });
      });

      return newMap;
    });

    handlerLogger.info("Camera angle variations setup complete", {
      count: variationsToGenerate.length,
      usedFibo: !!fiboText,
    });

    setIsGenerating(false);
  } catch (error) {
    // Clean up placeholders on error
    const placeholderIds = placeholderImages.map((img) => img.id);
    setImages((prev) => prev.filter((img) => !placeholderIds.includes(img.id)));

    handlerLogger.error(
      "Camera angle variation handler failed",
      error as Error,
    );

    showErrorFromException(
      "Generation failed",
      error,
      "Failed to generate camera angle variations",
    );

    setIsGenerating(false);
  }
};
