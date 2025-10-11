import type { PlacedImage } from "@/types/canvas";
import type { FalClient } from "@fal-ai/client";
import { CAMERA_VARIATIONS } from "@/constants/camera-variations";
import { snapPosition } from "@/utils/snap-utils";

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

  // Get crop values or use defaults
  const cropX = selectedImage.cropX || 0;
  const cropY = selectedImage.cropY || 0;
  const cropWidth = selectedImage.cropWidth || 1;
  const cropHeight = selectedImage.cropHeight || 1;

  // Calculate effective dimensions
  const effectiveWidth = cropWidth * imgElement.naturalWidth;
  const effectiveHeight = cropHeight * imgElement.naturalHeight;

  // Create canvas for the source image
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) throw new Error("Failed to get canvas context");

  canvas.width = effectiveWidth;
  canvas.height = effectiveHeight;

  // Draw the cropped image
  ctx.drawImage(
    imgElement,
    cropX * imgElement.naturalWidth,
    cropY * imgElement.naturalHeight,
    cropWidth * imgElement.naturalWidth,
    cropHeight * imgElement.naturalHeight,
    0,
    0,
    canvas.width,
    canvas.height
  );

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
    dimensions: { width: effectiveWidth, height: effectiveHeight },
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
}

/**
 * Calculate position for a variation image on each side of the source
 * Creates an arrangement with 4 variations directly adjacent (top, right, bottom, left)
 * @param sourceX - X coordinate of the source image
 * @param sourceY - Y coordinate of the source image
 * @param angleIndex - Index of the variation (0-3: top, right, bottom, left)
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
  // Place variations directly adjacent to each side, relative to source edges
  switch (angleIndex) {
    case 0: // Top - aligned with source left edge
      return {
        x: sourceX,
        y: sourceY - variationHeight,
      };
    case 1: // Right - aligned with source top edge
      return {
        x: sourceX + sourceWidth,
        y: sourceY,
      };
    case 2: // Bottom - aligned with source left edge
      return {
        x: sourceX,
        y: sourceY + sourceHeight,
      };
    case 3: // Left - aligned with source top edge
      return {
        x: sourceX - variationWidth,
        y: sourceY,
      };
    default:
      return { x: sourceX, y: sourceY };
  }
}

/**
 * Handle variation generation for a selected image
 * Generates 4 variations with different camera settings positioned on each side
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

  // OPTIMIZATION 1: Create placeholders IMMEDIATELY (optimistic UI)
  // Users see instant feedback before any async operations
  const placeholderImages: PlacedImage[] = CAMERA_VARIATIONS.map((_, index) => {
    const position = calculateBalancedPosition(
      snappedSource.x,
      snappedSource.y,
      index,
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
  });

  // Add placeholders immediately - single state update
  setImages((prev) => [...prev, ...placeholderImages]);

  // Show immediate feedback
  toast({
    title: "Generating variations",
    description: "Creating 4 camera angle variations...",
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

    console.log("Starting generation without placeholders...");

    // Snap source image position for consistent alignment
    const snappedSource = snapPosition(selectedImage.x, selectedImage.y);

    // Generate all variations in parallel
    console.log("Starting generation of 4 variations in parallel...");

    const variationPromises = CAMERA_VARIATIONS.map(
      async (cameraPrompt, index) => {
        // Combine user's variation prompt with camera angle prompt
        const combinedPrompt = variationPrompt
          ? `${variationPrompt}. ${cameraPrompt}`
          : cameraPrompt;

        console.log(
          `Starting variation ${index + 1}/4 with prompt: ${combinedPrompt.substring(0, 50)}...`
        );

        // OPTIMIZATION 4: Batch all activeGeneration updates into single state update
        setActiveGenerations((prev) => {
          const newMap = new Map(prev);
          CAMERA_VARIATIONS.forEach((prompt, index) => {
            const placeholderId = `variation-${timestamp}-${index}`;
            newMap.set(placeholderId, {
              imageUrl: uploadResult.url,
              prompt: prompt,
            });
          });
          return newMap;
        });

        // Setup complete - StreamingImage components will handle generation
        setIsGenerating(false);
      }
    );
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
