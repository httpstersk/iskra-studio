/**
 * Camera Angles Image Variation Handler
 * Generates image variations with different camera angles and perspectives
 *
 * @module lib/handlers/variation-handler
 */

import { fiboStructuredToText } from "@/lib/utils/fibo-to-text";
import { showError, showErrorFromException } from "@/lib/toast";
import { logger } from "@/shared/logging/logger";
import type { PlacedImage } from "@/types/canvas";
import { selectRandomCameraVariations } from "@/utils/camera-variation-utils";
import { selectRandomLightingVariations } from "@/utils/lighting-variation-utils";
import {
  applyPixelatedOverlayToReferenceImage,
  createPlaceholderFactory,
  handleVariationError,
  performEarlyPreparation,
  performImageUploadWorkflow,
  removeAnalyzingStatus,
  setAnalyzingStatus,
  VARIATION_STATUS,
} from "./variation-shared-utils";
import { validateSingleImageSelection } from "./variation-utils";

/**
 * Response from camera angle variations API
 */
interface CameraAngleVariationsResponse {
  refinedPrompts: Array<{
    cameraAngle: string;
    refinedStructuredPrompt: Record<string, unknown>; // FIBO JSON refined with camera angle
  }>;
  fiboAnalysis: unknown;
}

/**
 * Response from lighting variations API
 */
interface LightingVariationsResponse {
  refinedPrompts: Array<{
    lightingScenario: string;
    refinedStructuredPrompt: Record<string, unknown>; // FIBO JSON refined with lighting
  }>;
  fiboAnalysis: unknown;
}

/**
 * Generates camera angle variations (FIBO analysis + camera angle refinement on server)
 */
async function generateCameraAngleVariations(
  imageUrl: string,
  cameraAngles: string[],
  userContext?: string
): Promise<CameraAngleVariationsResponse> {
  const response = await fetch("/api/generate-camera-angle-variations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      imageUrl,
      cameraAngles,
      userContext,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.error ||
        `Camera angle variations generation failed with status ${response.status}`
    );
  }

  return response.json();
}

/**
 * Generates lighting variations (FIBO analysis + lighting refinement on server)
 */
async function generateLightingVariations(
  imageUrl: string,
  lightingScenarios: string[],
  userContext?: string
): Promise<LightingVariationsResponse> {
  const response = await fetch("/api/generate-lighting-variations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      imageUrl,
      lightingScenarios,
      userContext,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.error ||
        `Lighting variations generation failed with status ${response.status}`
    );
  }

  return response.json();
}

/**
 * Dependencies for variation generation handler
 */
interface VariationHandlerDeps {
  /** Model to use for image generation */
  imageModel?: "seedream" | "nano-banana";
  /** Type of image variation (camera-angles, director, or lighting) */
  imageVariationType?: "camera-angles" | "director" | "lighting";
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
        "Video generation handlers not available"
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

  // IMAGE MODE with lighting: Generate lighting variations using FIBO analysis
  if (variationMode === "image" && imageVariationType === "lighting") {
    const handlerLogger = logger.child({ handler: "lighting-variation" });

    // Validate selection early
    const selectedImage = validateSingleImageSelection(images, selectedIds);
    if (!selectedImage) {
      return;
    }

    setIsGenerating(true);
    const timestamp = Date.now();
    let placeholderImages: PlacedImage[] = [];

    try {
      // OPTIMIZATION: Perform early preparation BEFORE async operations
      const {
        imageSizeDimensions,
        pixelatedSrc,
        positionIndices,
        snappedSource,
      } = await performEarlyPreparation(selectedImage, variationCount);

      // Randomly select lighting scenarios (no duplicates via Fisher-Yates)
      const variationsToGenerate =
        selectRandomLightingVariations(variationCount);

      // Create factory function with shared configuration for all placeholders
      const makePlaceholder = createPlaceholderFactory({
        imageSizeDimensions,
        pixelatedSrc,
        positionIndices,
        selectedImage,
        snappedSource,
        timestamp,
      });

      // Create placeholders IMMEDIATELY with lightingScenario metadata (BEFORE upload)
      placeholderImages = variationsToGenerate.map((lightingScenario, index) =>
        makePlaceholder({ lightingScenario }, index)
      );

      setImages((prev) => [...prev, ...placeholderImages]);

      // Stage 0: Upload image to Convex
      const { signedImageUrl } = await performImageUploadWorkflow({
        selectedImage,
        setActiveGenerations,
        timestamp,
      });

      // Stage 1: Apply pixelated overlay during analysis
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

      // Stage 2: Call API to get FIBO analysis + refined lighting prompts
      const { refinedPrompts } = await generateLightingVariations(
        signedImageUrl,
        variationsToGenerate,
        variationPrompt
      );

      // Remove analyzing status
      removeAnalyzingStatus(processId, setActiveGenerations);

      // Stage 3: Set up active generations for Seedream/Nano Banana
      // Convert refined FIBO structured JSON to text prompts for Seedream/Nano Banana
      setActiveGenerations((prev) => {
        const newMap = new Map(prev);

        refinedPrompts.forEach((item, index) => {
          const placeholderId = `variation-${timestamp}-${index}`;

          // Convert refined FIBO JSON (with lighting baked in) to text prompt
          const finalPrompt = fiboStructuredToText(
            item.refinedStructuredPrompt
          );

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

      handlerLogger.info("Lighting variations setup complete", {
        lightingCount: refinedPrompts.length,
      });

      setIsGenerating(false);
    } catch (error) {
      handlerLogger.error("Lighting variation handler failed", error as Error);

      await handleVariationError({
        error,
        selectedImage,
        setActiveGenerations,
        setImages,
        setIsGenerating,
        timestamp,
      });

      showErrorFromException(
        "Generation failed",
        error,
        "Failed to generate lighting variations"
      );
    }

    return;
  }

  // IMAGE MODE with camera-angles: Generate camera angle variations using FIBO analysis
  // This path is taken when variationMode === "image" && imageVariationType === "camera-angles"

  // Validate selection early
  const selectedImage = validateSingleImageSelection(images, selectedIds);
  if (!selectedImage) {
    return;
  }

  setIsGenerating(true);
  const timestamp = Date.now();
  let placeholderImages: PlacedImage[] = []; // Define outside try block for error cleanup

  try {
    // OPTIMIZATION: Perform early preparation BEFORE async operations
    const {
      imageSizeDimensions,
      pixelatedSrc,
      positionIndices,
      snappedSource,
    } = await performEarlyPreparation(selectedImage, variationCount);

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

    // Create placeholders IMMEDIATELY with cameraAngle metadata (BEFORE upload)
    placeholderImages = variationsToGenerate.map((cameraDirective, index) =>
      makePlaceholder({ cameraAngle: cameraDirective }, index)
    );

    setImages((prev) => [...prev, ...placeholderImages]);

    // Stage 0: Upload image to Convex
    const { signedImageUrl } = await performImageUploadWorkflow({
      selectedImage,
      setActiveGenerations,
      timestamp,
    });

    // Stage 1: Apply pixelated overlay during analysis
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

    // Stage 2: Call API to get FIBO analysis + refined camera angle prompts
    const { refinedPrompts } = await generateCameraAngleVariations(
      signedImageUrl,
      variationsToGenerate,
      variationPrompt
    );

    // Remove analyzing status
    removeAnalyzingStatus(processId, setActiveGenerations);

    // Stage 3: Update existing placeholders with camera angle metadata (already set during creation)

    // Stage 4: Set up active generations for Seedream/Nano Banana
    // Convert refined FIBO structured JSON to text prompts for Seedream/Nano Banana
    setActiveGenerations((prev) => {
      const newMap = new Map(prev);

      refinedPrompts.forEach((item, index) => {
        const placeholderId = `variation-${timestamp}-${index}`;

        // Convert refined FIBO JSON (with camera angle baked in) to text prompt
        const finalPrompt = fiboStructuredToText(item.refinedStructuredPrompt);

        newMap.set(placeholderId, {
          imageSize: imageSizeDimensions,
          imageUrl: signedImageUrl,
          isVariation: true,
          model: imageModel, // Use selected model (seedream or nano-banana)
          prompt: finalPrompt, // Text prompt from refined FIBO JSON
          status: VARIATION_STATUS.GENERATING,
        });
      });

      return newMap;
    });

    setIsGenerating(false);
  } catch (error) {
    await handleVariationError({
      error,
      selectedImage,
      setActiveGenerations,
      setImages,
      setIsGenerating,
      timestamp,
    });

    showErrorFromException(
      "Generation failed",
      error,
      "Failed to generate camera angle variations"
    );
  }
};
