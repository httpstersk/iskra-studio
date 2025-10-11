import type { PlacedImage } from "@/types/canvas";
import type { FalClient } from "@fal-ai/client";
import { CAMERA_VARIATIONS } from "@/constants/camera-variations";
import { uploadImageDirect } from "./generation-handler";
import { snapPosition } from "@/utils/snap-utils";

interface VariationHandlerDeps {
  images: PlacedImage[];
  selectedIds: string[];
  customApiKey?: string;
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
  generateImageVariation: (params: any) => Promise<any>;
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
    setActiveGenerations,
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

    // Snap source image position for consistent alignment
    const snappedSource = snapPosition(selectedImage.x, selectedImage.y);

    // Create placeholder images immediately for better UX
    const timestamp = Date.now();
    const placeholderImages: PlacedImage[] = [];
    
    console.log("Creating placeholder images for 4 variations...");
    
    CAMERA_VARIATIONS.forEach((prompt, index) => {
      const position = calculateBalancedPosition(
        snappedSource.x,
        snappedSource.y,
        index,
        selectedImage.width,
        selectedImage.height,
        selectedImage.width,
        selectedImage.height
      );

      const placeholderId = `variation-${timestamp}-${index}`;
      
      const placeholderImage: PlacedImage = {
        id: placeholderId,
        src: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
        x: position.x,
        y: position.y,
        width: selectedImage.width,
        height: selectedImage.height,
        rotation: 0,
        isGenerated: true,
        isLoading: true,
      };

      placeholderImages.push(placeholderImage);

      // Add to activeGenerations Map so StreamingImage can handle it
      setActiveGenerations((prev) => {
        const newMap = new Map(prev);
        newMap.set(placeholderId, {
          imageUrl: uploadResult.url,
          prompt: prompt,
        });
        return newMap;
      });
    });

    // Add all placeholder images to canvas at once
    setImages((prev) => [...prev, ...placeholderImages]);

    console.log("Placeholders created. StreamingImage components will handle generation.");

    // Now that placeholders are created and activeGenerations are set,
    // the StreamingImage components will handle the actual generation
    // We can turn off the generating flag since the setup is complete
    setIsGenerating(false);

    toast({
      title: "Generating variations",
      description: "Creating 4 camera angle variations...",
    });

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
    setIsGenerating(false);
  }
};
