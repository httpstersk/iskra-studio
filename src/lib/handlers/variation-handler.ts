import { formatImageVariationPrompt } from "@/lib/prompt-formatters/image-variation-prompt-formatter";
import type { PlacedImage } from "@/types/canvas";
import { selectRandomCameraVariations } from "@/utils/camera-variation-utils";
import { getOptimalImageDimensions } from "@/utils/image-crop-utils";
import { snapPosition } from "@/utils/snap-utils";
import type { FalClient } from "@fal-ai/client";
import {
  ensureImageInConvex,
  toSignedUrl,
  validateSingleImageSelection,
} from "./variation-utils";

interface VariationHandlerDeps {
  falClient: FalClient;
  images: PlacedImage[];
  selectedIds: string[];
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
  setVideos?: React.Dispatch<
    React.SetStateAction<import("@/types/canvas").PlacedVideo[]>
  >;
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveGenerations: React.Dispatch<
    React.SetStateAction<Map<string, import("@/types/canvas").ActiveGeneration>>
  >;
  setActiveVideoGenerations?: React.Dispatch<
    React.SetStateAction<Map<string, any>>
  >;
  toast: (props: {
    title: string;
    description?: string;
    variant?: "default" | "destructive";
  }) => void;
  userId?: string;
  variationPrompt?: string;
  variationMode?: "image" | "video";
  variationCount?: number;
  videoSettings?: import("@/types/canvas").VideoGenerationSettings;
  viewport: { x: number; y: number; scale: number };
}

/**
 * Calculate position for a variation image around the source
 * Positions are arranged clockwise starting from top center
 * For 8 variations: top, top-right corner, right, bottom-right corner, bottom, bottom-left corner, left, top-left corner
 * For 4 variations: uses indices 0, 2, 4, 6 (top, right, bottom, left)
 * For 12 variations: positions 0-7 are the inner ring, positions 8-11 are outer cardinal directions
 * @param sourceX - X coordinate of the source image
 * @param sourceY - Y coordinate of the source image
 * @param angleIndex - Index of the variation (0-11)
 * @param sourceWidth - Width of the source image
 * @param sourceHeight - Height of the source image
 * @param variationWidth - Width of the variation image
 * @param variationHeight - Height of the variation image
 */
export function calculateBalancedPosition(
  sourceX: number,
  sourceY: number,
  angleIndex: number,
  sourceWidth: number,
  sourceHeight: number,
  variationWidth: number,
  variationHeight: number
) {
  // Clockwise positions starting from top center
  switch (angleIndex) {
    case 0: // Top - aligned with source left edge
      return {
        x: sourceX,
        y: sourceY - variationHeight,
      };
    case 1: // Top-right corner
      return {
        x: sourceX + sourceWidth,
        y: sourceY - variationHeight,
      };
    case 2: // Right - aligned with source top edge
      return {
        x: sourceX + sourceWidth,
        y: sourceY,
      };
    case 3: // Bottom-right corner
      return {
        x: sourceX + sourceWidth,
        y: sourceY + sourceHeight,
      };
    case 4: // Bottom - aligned with source left edge
      return {
        x: sourceX,
        y: sourceY + sourceHeight,
      };
    case 5: // Bottom-left corner
      return {
        x: sourceX - variationWidth,
        y: sourceY + sourceHeight,
      };
    case 6: // Left - aligned with source top edge
      return {
        x: sourceX - variationWidth,
        y: sourceY,
      };
    case 7: // Top-left corner
      return {
        x: sourceX - variationWidth,
        y: sourceY - variationHeight,
      };
    // Outer ring positions (8-11) for 12 variations - placed at cardinal directions outside the inner ring
    case 8: // Top middle (outer) - centered horizontally, one image further out
      return {
        x: sourceX + sourceWidth / 2 - variationWidth / 2,
        y: sourceY - variationHeight * 2,
      };
    case 9: // Right middle (outer) - centered vertically, one image further out
      return {
        x: sourceX + sourceWidth * 2,
        y: sourceY + sourceHeight / 2 - variationHeight / 2,
      };
    case 10: // Bottom middle (outer) - centered horizontally, one image further out
      return {
        x: sourceX + sourceWidth / 2 - variationWidth / 2,
        y: sourceY + sourceHeight * 2,
      };
    case 11: // Left middle (outer) - centered vertically, one image further out
      return {
        x: sourceX - variationWidth * 2,
        y: sourceY + sourceHeight / 2 - variationHeight / 2,
      };
    default:
      return { x: sourceX, y: sourceY };
  }
}

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
    toast,
    userId,
    variationCount = 4,
    variationMode = "image",
    variationPrompt,
    videoSettings,
    viewport,
  } = deps;

  // Route to appropriate handler based on variation mode:
  // - Video mode: Uses Sora 2 with AI analysis (image analysis + storyline generation)
  // - Image mode: Uses Seedream without AI analysis (continues below)
  if (variationMode === "video") {
    if (!setVideos || !setActiveVideoGenerations) {
      toast({
        title: "Configuration error",
        description: "Video generation handlers not available",
        variant: "destructive",
      });
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
      toast,
      userId,
      videoSettings,
      viewport,
    });
  }

  // IMAGE MODE: Generate variations using Seedream (no AI analysis)
  // This path is taken when variationMode === "image"

  // Validate selection early
  const selectedImage = validateSingleImageSelection(
    images,
    selectedIds,
    toast
  );
  if (!selectedImage) {
    return;
  }

  setIsGenerating(true);

  // Snap source position for consistent alignment
  const snappedSource = snapPosition(selectedImage.x, selectedImage.y);
  const timestamp = Date.now();

  // Randomly select camera variations from the expanded set
  // Position indices are assigned sequentially based on variation count:
  // 4 variations: cardinal directions (0, 2, 4, 6)
  // 8 variations: all 8 positions (0-7)
  // 12 variations: inner ring (0-7) + outer cardinal directions (8-11)
  const variationsToGenerate = selectRandomCameraVariations(variationCount);
  let positionIndices: number[];

  if (variationCount === 4) {
    positionIndices = [0, 2, 4, 6];
  } else if (variationCount === 8) {
    positionIndices = [0, 1, 2, 3, 4, 5, 6, 7];
  } else {
    positionIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  }

  // Get optimal dimensions for variations (4K resolution: 3840x2160 or 2160x3840)
  // Calculate this early so we can add natural dimensions to placeholders
  const imageSizeDimensions = getOptimalImageDimensions(
    selectedImage.width,
    selectedImage.height
  );

  // OPTIMIZATION 1: Create placeholders IMMEDIATELY (optimistic UI)
  // Users see instant feedback before any async operations

  const placeholderImages: PlacedImage[] = variationsToGenerate.map(
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
        rotation: 0,
        src: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        width: selectedImage.width,
        x: position.x,
        y: position.y,
        naturalWidth: imageSizeDimensions.width,
        naturalHeight: imageSizeDimensions.height,
      };
    }
  );

  // Add placeholders immediately - single state update
  setImages((prev) => [...prev, ...placeholderImages]);

  try {
    // Ensure image is in Convex (reuses existing URL if already there)
    const imageUrl = await ensureImageInConvex(selectedImage.src, toast);

    // OPTIMIZATION 4: Batch all activeGeneration updates into single state update
    // Convert proxy URL to signed URL for tRPC (imageUrl could be proxy or full Convex URL)
    const signedImageUrl = toSignedUrl(imageUrl);
    
    setActiveGenerations((prev) => {
      const newMap = new Map(prev);
      variationsToGenerate.forEach((cameraDirective, index) => {
        const placeholderId = `variation-${timestamp}-${index}`;
        const formattedPrompt = formatImageVariationPrompt(
          cameraDirective,
          variationPrompt
        );

        newMap.set(placeholderId, {
          imageUrl: signedImageUrl,
          prompt: formattedPrompt,
          isVariation: true,
          imageSize: imageSizeDimensions,
        });
      });

      return newMap;
    });

    // Setup complete - StreamingImage components will handle generation
    setIsGenerating(false);
  } catch (error) {
    console.error("Error in variation generation:", error);

    // Clean up placeholders on error
    const placeholderIds = placeholderImages.map((img) => img.id);
    setImages((prev) => prev.filter((img) => !placeholderIds.includes(img.id)));

    toast({
      title: "Generation failed",
      description:
        error instanceof Error
          ? error.message
          : "Failed to generate variations",
      variant: "destructive",
    });

    setIsGenerating(false);
  }
};
