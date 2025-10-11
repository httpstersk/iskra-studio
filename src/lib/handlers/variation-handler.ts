import type { PlacedImage } from "@/types/canvas";
import type { FalClient } from "@fal-ai/client";
import { CAMERA_VARIATIONS } from "@/constants/camera-variations";
import { snapPosition } from "@/utils/snap-utils";
import { determineAspectRatio } from "@/utils/image-crop-utils";

/**
 * Optimized upload function that accepts blob directly (no FileReader conversion)
 */
async function uploadBlobDirect(
  blob: Blob,
  falClient: FalClient,
  toast: VariationHandlerDeps["toast"],
  setIsApiKeyDialogOpen: VariationHandlerDeps["setIsApiKeyDialogOpen"]
): Promise<{ url: string }> {
  try {
    if (blob.size > 10 * 1024 * 1024) {
      console.warn("Large image:", (blob.size / 1024 / 1024).toFixed(2) + "MB");
    }

    const uploadResult = await falClient.storage.upload(blob);
    return { url: uploadResult };
  } catch (error: any) {
    const isRateLimit =
      error.status === 429 ||
      error.message?.includes("429") ||
      error.message?.includes("rate limit") ||
      error.message?.includes("Rate limit");

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
 * Process image to blob efficiently without FileReader
 */
async function processImageToBlob(
  selectedImage: PlacedImage
): Promise<{ blob: Blob; dimensions: { width: number; height: number } }> {
  // Load image
  const imgElement = new window.Image();
  imgElement.crossOrigin = "anonymous";
  imgElement.src = selectedImage.src;

  await new Promise<void>((resolve, reject) => {
    imgElement.onload = () => resolve();
    imgElement.onerror = reject;
  });

  // Create canvas for the source image
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Failed to get canvas context");

  canvas.width = imgElement.naturalWidth;
  canvas.height = imgElement.naturalHeight;

  // Draw the image
  ctx.drawImage(imgElement, 0, 0);

  // Convert to blob directly (no FileReader needed)
  // Use JPEG for better performance if no transparency needed
  const hasTransparency =
    selectedImage.src.includes(".png") ||
    selectedImage.src.includes("image/png");
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      },
      hasTransparency ? "image/png" : "image/jpeg",
      0.95
    );
  });

  return {
    blob,
    dimensions: { width: canvas.width, height: canvas.height },
  };
}

interface VariationHandlerDeps {
  images: PlacedImage[];
  selectedIds: string[];
  viewport: { x: number; y: number; scale: number };
  falClient: FalClient;
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  setIsApiKeyDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setActiveGenerations: React.Dispatch<
    React.SetStateAction<Map<string, import("@/types/canvas").ActiveGeneration>>
  >;
  toast: (props: {
    title: string;
    description?: string;
    variant?: "default" | "destructive";
  }) => void;
  variationPrompt?: string;
  variationMode?: "image" | "video";
}

/**
 * Calculate position for a variation image around the source
 * Positions are arranged clockwise starting from top center
 * For 8 variations: top, top-right corner, right, bottom-right corner, bottom, bottom-left corner, left, top-left corner
 * For 4 variations: uses indices 0, 2, 4, 6 (top, right, bottom, left)
 * @param sourceX - X coordinate of the source image
 * @param sourceY - Y coordinate of the source image
 * @param angleIndex - Index of the variation (0-7)
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
    default:
      return { x: sourceX, y: sourceY };
  }
}

/**
 * Handle variation generation for a selected image
 * Generates 4 or 8 variations with different camera settings
 * Image mode: 8 variations (sides + corners)
 * Video mode: 4 variations (sides only)
 * Optimized for maximum performance and UX
 */
export const handleVariationGeneration = async (deps: VariationHandlerDeps) => {
  const {
    images,
    selectedIds,
    falClient,
    setImages,
    setIsGenerating,
    setIsApiKeyDialogOpen,
    setActiveGenerations,
    toast,
    variationPrompt,
    variationMode = "image",
  } = deps;

  // Validate selection early
  if (selectedIds.length !== 1) {
    toast({
      title: "Select one image",
      description: "Please select exactly one image to generate variations",
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

  // Snap source position for consistent alignment
  const snappedSource = snapPosition(selectedImage.x, selectedImage.y);
  const timestamp = Date.now();

  // Determine number of variations based on mode
  // For video mode, use indices 0, 2, 4, 6 (top, right, bottom, left - the 4 sides in clockwise order starting from top)
  const variationCount = variationMode === "image" ? 8 : 4;
  const variationsToGenerate =
    variationMode === "image"
      ? CAMERA_VARIATIONS
      : [
          CAMERA_VARIATIONS[0],
          CAMERA_VARIATIONS[2],
          CAMERA_VARIATIONS[4],
          CAMERA_VARIATIONS[6],
        ];

  // OPTIMIZATION 1: Create placeholders IMMEDIATELY (optimistic UI)
  // Users see instant feedback before any async operations
  // For video mode, use position indices 0, 2, 4, 6 (top, right, bottom, left - the 4 cardinal directions)
  const positionIndices =
    variationMode === "image" ? [0, 1, 2, 3, 4, 5, 6, 7] : [0, 2, 4, 6];

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
        id: `variation-${timestamp}-${index}`,
        src: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        x: position.x,
        y: position.y,
        width: selectedImage.width,
        height: selectedImage.height,
        rotation: 0,
        isGenerated: true,
        isLoading: true,
      };
    }
  );

  // Add placeholders immediately - single state update
  setImages((prev) => [...prev, ...placeholderImages]);

  // Show immediate feedback
  toast({
    title: "Generating variations",
    description: `Creating ${variationCount} ${variationMode === "image" ? "image" : "video"} variations...`,
  });

  try {
    // OPTIMIZATION 2: Process image to blob without FileReader
    const { blob } = await processImageToBlob(selectedImage);

    // OPTIMIZATION 3: Upload blob directly (no FileReader conversion)
    const uploadResult = await uploadBlobDirect(
      blob,
      falClient,
      toast,
      setIsApiKeyDialogOpen
    );

    // Snap source image position for consistent alignment
    const snappedSource = snapPosition(selectedImage.x, selectedImage.y);

    // Determine aspect ratio for variations (lock to 16:9 or 9:16)
    const aspectRatioMode = determineAspectRatio(
      selectedImage.width,
      selectedImage.height
    );

    // OPTIMIZATION 4: Batch all activeGeneration updates into single state update
    setActiveGenerations((prev) => {
      const newMap = new Map(prev);
      variationsToGenerate.forEach((cameraPrompt, index) => {
        const placeholderId = `variation-${timestamp}-${index}`;
        // Combine user's variation prompt with camera angle prompt
        const combinedPrompt = variationPrompt
          ? `${variationPrompt}. ${cameraPrompt}`
          : cameraPrompt;

        newMap.set(placeholderId, {
          imageUrl: uploadResult.url,
          prompt: combinedPrompt,
          isVariation: true,
          imageSize: aspectRatioMode,
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
