import type { PlacedImage } from "@/types/canvas";
import type { FalClient } from "@fal-ai/client";
import { CAMERA_VARIATIONS } from "@/constants/camera-variations";
import { uploadImageDirect } from "./generation-handler";
import { createPixelatedImage } from "@/utils/placeholder-utils";

interface VariationHandlerDeps {
  images: PlacedImage[];
  selectedIds: string[];
  customApiKey?: string;
  viewport: { x: number; y: number; scale: number };
  falClient: FalClient;
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  setIsApiKeyDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toast: (props: {
    title: string;
    description?: string;
    variant?: "default" | "destructive";
  }) => void;
  generateImageVariation: (params: any) => Promise<any>;
}

/**
 * Calculate position for a variation image with higher density on left and right sides
 * Creates a visually balanced arrangement with 12 variations
 * @param centerX - X coordinate of the source image center
 * @param centerY - Y coordinate of the source image center
 * @param radius - Distance from center to place the variation
 * @param angleIndex - Index of the variation (0-11)
 * @param variationWidth - Width of the variation image
 * @param variationHeight - Height of the variation image
 */
export function calculateBalancedPosition(
  centerX: number,
  centerY: number,
  radius: number,
  angleIndex: number,
  variationWidth: number,
  variationHeight: number
) {
  // Arrange 12 images with higher density on left and right:
  const angles = [-35, -10, 10, 35, 75, 105, 145, 170, 190, 215, 255, 285];
  const angleInDegrees = angles[angleIndex];
  const angleInRadians = (angleInDegrees * Math.PI) / 180;

  // Calculate position on the circle
  const x = centerX + radius * Math.cos(angleInRadians) - variationWidth / 2;
  const y = centerY + radius * Math.sin(angleInRadians) - variationHeight / 2;

  return { x, y };
}

/**
 * Handle variation generation for a selected image
 * Generates 12 variations with different camera settings positioned in a circle
 */
export const handleVariationGeneration = async (deps: VariationHandlerDeps) => {
  const {
    images,
    selectedIds,
    customApiKey,
    falClient,
    setImages,
    setIsGenerating,
    setIsApiKeyDialogOpen,
    toast,
    generateImageVariation,
  } = deps;

  // Ensure exactly one image is selected
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

  try {
    // Calculate source image center
    const sourceCenterX = selectedImage.x + selectedImage.width / 2;
    const sourceCenterY = selectedImage.y + selectedImage.height / 2;

    // Calculate radius for circular placement (distance from center to variations)
    // Using 1.2x the diagonal of the source image as the radius
    const diagonal = Math.sqrt(
      selectedImage.width ** 2 + selectedImage.height ** 2
    );
    const radius = diagonal * 1.2;

    // Load and prepare the source image
    const imgElement = new window.Image();
    imgElement.crossOrigin = "anonymous";
    imgElement.src = selectedImage.src;
    await new Promise((resolve, reject) => {
      imgElement.onload = resolve;
      imgElement.onerror = reject;
    });

    // Get crop values or use defaults
    const cropX = selectedImage.cropX || 0;
    const cropY = selectedImage.cropY || 0;
    const cropWidth = selectedImage.cropWidth || 1;
    const cropHeight = selectedImage.cropHeight || 1;

    // Create canvas for the source image
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    // Calculate effective dimensions
    const effectiveWidth = cropWidth * imgElement.naturalWidth;
    const effectiveHeight = cropHeight * imgElement.naturalHeight;

    // Set canvas size to original resolution
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

    // Convert to blob and upload
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), "image/png");
    });

    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve) => {
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(blob);
    });

    // Upload the image
    let uploadResult;
    try {
      uploadResult = await uploadImageDirect(
        dataUrl,
        falClient,
        toast,
        setIsApiKeyDialogOpen
      );
    } catch (uploadError) {
      console.error("Failed to upload image:", uploadError);
      toast({
        title: "Upload failed",
        description: "Failed to upload the source image",
        variant: "destructive",
      });
      setIsGenerating(false);
      return;
    }

    if (!uploadResult?.url) {
      console.error("Upload succeeded but no URL returned");
      toast({
        title: "Upload failed",
        description: "No URL returned from upload",
        variant: "destructive",
      });
      setIsGenerating(false);
      return;
    }

    // Create placeholders for all 12 variations
    const timestamp = Date.now();
    const placeholderIds: string[] = [];
    const placeholders: PlacedImage[] = [];

    console.log("Creating 12 variation placeholders...");

    // Create blurred version of the source image as loading placeholder
    const blurredPlaceholder = createPixelatedImage(imgElement, 15);

    for (let i = 0; i < 12; i++) {
      const placeholderId = `variation-${timestamp}-${i}`;
      placeholderIds.push(placeholderId);

      const { x, y } = calculateBalancedPosition(
        sourceCenterX,
        sourceCenterY,
        radius,
        i,
        selectedImage.width,
        selectedImage.height
      );

      placeholders.push({
        id: placeholderId,
        src: blurredPlaceholder,
        x,
        y,
        width: selectedImage.width,
        height: selectedImage.height,
        rotation: 0,
        isGenerated: true,
        isLoading: true,
      });

      console.log(
        `Created placeholder ${i + 1}/12: ${placeholderId} at (${Math.round(x)}, ${Math.round(y)})`
      );
    }

    // Add placeholders to canvas
    console.log(`Adding ${placeholders.length} placeholders to canvas...`);
    setImages((prev) => {
      const newImages = [...prev, ...placeholders];
      console.log(
        `Total images after adding placeholders: ${newImages.length}`
      );
      return newImages;
    });

    // Generate all variations in parallel
    console.log("Starting generation of 12 variations in parallel...");
    const variationPromises = CAMERA_VARIATIONS.map(async (prompt, index) => {
      try {
        console.log(
          `Starting variation ${index + 1}/12 with prompt: ${prompt.substring(0, 50)}...`
        );

        const result = await generateImageVariation({
          imageUrl: uploadResult.url,
          prompt: prompt,
          imageSize: {
            width: Math.min(canvas.width, 2048),
            height: Math.min(canvas.height, 2048),
          },
          apiKey: customApiKey || undefined,
        });

        console.log(`Variation ${index + 1}/12 completed successfully`);

        // Update the placeholder with the generated image and remove loading state
        setImages((prev) =>
          prev.map((img) =>
            img.id === placeholderIds[index]
              ? { ...img, src: result.url, isLoading: false }
              : img
          )
        );

        return result;
      } catch (error) {
        console.error(`Failed to generate variation ${index + 1}/12:`, error);
        // Remove the failed placeholder
        setImages((prev) =>
          prev.filter((img) => img.id !== placeholderIds[index])
        );
        throw error;
      }
    });

    // Wait for all variations to complete
    const results = await Promise.allSettled(variationPromises);

    // Count successes and failures
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failureCount = results.filter((r) => r.status === "rejected").length;

    // Show completion toast
    if (successCount > 0) {
      toast({
        title: "Variations generated",
        description: `Successfully generated ${successCount} of 12 variations`,
      });
    }

    if (failureCount > 0) {
      toast({
        title: "Some variations failed",
        description: `${failureCount} variations could not be generated`,
        variant: "destructive",
      });
    }
  } catch (error) {
    console.error("Error generating variations:", error);
    toast({
      title: "Generation failed",
      description:
        error instanceof Error
          ? error.message
          : "Failed to generate variations",
      variant: "destructive",
    });
  } finally {
    setIsGenerating(false);
  }
};
