import type { PlacedImage } from "@/types/canvas";
import type { FalClient } from "@fal-ai/client";
import { CAMERA_VARIATIONS } from "@/constants/camera-variations";
import { uploadImageDirect } from "./generation-handler";

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
 * Calculate position for a variation image on each side of the source
 * Creates an arrangement with 4 variations directly adjacent (top, right, bottom, left)
 * @param centerX - X coordinate of the source image center
 * @param centerY - Y coordinate of the source image center
 * @param angleIndex - Index of the variation (0-3: top, right, bottom, left)
 * @param sourceWidth - Width of the source image
 * @param sourceHeight - Height of the source image
 * @param variationWidth - Width of the variation image
 * @param variationHeight - Height of the variation image
 */
export function calculateBalancedPosition(
  centerX: number,
  centerY: number,
  angleIndex: number,
  sourceWidth: number,
  sourceHeight: number,
  variationWidth: number,
  variationHeight: number
) {
  // Place variations directly adjacent to each side
  switch (angleIndex) {
    case 0: // Top
      return {
        x: centerX - variationWidth / 2,
        y: centerY - sourceHeight / 2 - variationHeight,
      };
    case 1: // Right
      return {
        x: centerX + sourceWidth / 2,
        y: centerY - variationHeight / 2,
      };
    case 2: // Bottom
      return {
        x: centerX - variationWidth / 2,
        y: centerY + sourceHeight / 2,
      };
    case 3: // Left
      return {
        x: centerX - sourceWidth / 2 - variationWidth,
        y: centerY - variationHeight / 2,
      };
    default:
      return { x: centerX, y: centerY };
  }
}

/**
 * Handle variation generation for a selected image
 * Generates 4 variations with different camera settings positioned on each side
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

    // Store IDs for generated images
    const timestamp = Date.now();
    const generatedIds: string[] = [];

    console.log("Starting generation without placeholders...");

    // Generate all variations in parallel
    console.log("Starting generation of 4 variations in parallel...");
    const variationPromises = CAMERA_VARIATIONS.map(async (prompt, index) => {
      try {
        console.log(
          `Starting variation ${index + 1}/4 with prompt: ${prompt.substring(0, 50)}...`
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

        console.log(`Variation ${index + 1}/4 completed successfully`);

        // Calculate position for this variation
        const { x, y } = calculateBalancedPosition(
          sourceCenterX,
          sourceCenterY,
          index,
          selectedImage.width,
          selectedImage.height,
          selectedImage.width,
          selectedImage.height
        );

        // Create new image with the generated result
        const newImageId = `variation-${timestamp}-${index}`;
        generatedIds.push(newImageId);

        const newImage: PlacedImage = {
          id: newImageId,
          src: result.url,
          x,
          y,
          width: selectedImage.width,
          height: selectedImage.height,
          rotation: 0,
          isGenerated: true,
        };

        // Add the generated image to canvas
        setImages((prev) => [...prev, newImage]);

        return result;
      } catch (error) {
        console.error(`Failed to generate variation ${index + 1}/4:`, error);
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
        description: `Successfully generated ${successCount} of 4 variations`,
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
