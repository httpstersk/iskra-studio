import type {
  ActiveGeneration,
  GenerationSettings,
  PlacedImage,
} from "@/types/canvas";
import { showError, showErrorFromException } from "@/lib/toast";
import { downloadAndReupload } from "@/lib/handlers/asset-download-handler";
import {
  calculateCenteredPlacement,
  convertImageToBlob,
} from "@/utils/canvas-utils";
import { uploadImageDirect } from "@/lib/utils/upload-utils";

interface GenerationHandlerDeps {
  images: PlacedImage[];
  selectedIds: string[];
  generationSettings: GenerationSettings;
  canvasSize: { width: number; height: number };
  viewport: { x: number; y: number; scale: number };
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setActiveGenerations: React.Dispatch<
    React.SetStateAction<Map<string, ActiveGeneration>>
  >;
  setIsGenerating: React.Dispatch<React.SetStateAction<boolean>>;
  generateTextToImage: (params: {
    prompt: string;
    seed?: number;
    imageSize?:
    | "landscape_4_3"
    | "portrait_4_3"
    | "square"
    | "landscape_16_9"
    | "portrait_16_9";
  }) => Promise<{ width: number; height: number; url: string }>;
  userId?: string; // Optional user ID for Convex storage
  useConvexStorage?: boolean; // Flag to enable Convex storage migration
}

/**
 * Adds a generated image to the canvas state.
 * Used for both initial generation and variations.
 */
export const addImageToCanvasState = (
  imageUrl: string,
  x: number,
  y: number,
  groupId: string,
  generationSettings: GenerationSettings,
  setImages: GenerationHandlerDeps["setImages"],
  setActiveGenerations: GenerationHandlerDeps["setActiveGenerations"],
  width: number = 300,
  height: number = 300,
) => {
  const placeholderId = `generated-${Date.now()}`;
  setImages((prev) => [
    ...prev,
    {
      id: placeholderId,
      src: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
      x,
      y,
      width,
      height,
      rotation: 0,
      isGenerated: true,
      parentGroupId: groupId,
    },
  ]);

  // Store generation params
  setActiveGenerations((prev) =>
    new Map(prev).set(placeholderId, {
      imageUrl,
      prompt: generationSettings.prompt,
    }),
  );
};

const handleOptimisticUpload = async (
  imageUrl: string,
  imageId: string,
  generationSettings: GenerationSettings,
  originalWidth: number,
  originalHeight: number,
  userId: string | undefined,
  useConvexStorage: boolean,
  setImages: GenerationHandlerDeps["setImages"],
) => {
  if (useConvexStorage && userId) {
    try {
      const migrationResult = await downloadAndReupload(imageUrl, {
        userId,
        type: "image",
        mimeType: "image/jpeg",
        metadata: {
          prompt: generationSettings.prompt,
          width: originalWidth,
          height: originalHeight,
        },
      });

      // Update image with permanent Convex URL once upload finishes
      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId
            ? { ...img, src: migrationResult.url, isLoading: false }
            : img,
        ),
      );
    } catch (error) {
      console.error("Background upload failed:", error);
      // Stop loading spinner, keep original URL
      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId ? { ...img, isLoading: false } : img,
        ),
      );
    }
  } else {
    // If not using Convex storage, just mark as loaded
    setImages((prev) =>
      prev.map((img) =>
        img.id === imageId ? { ...img, isLoading: false } : img,
      ),
    );
  }
};

const handleTextToImage = async (deps: GenerationHandlerDeps) => {
  const {
    generationSettings,
    canvasSize,
    viewport,
    setImages,
    setSelectedIds,
    generateTextToImage,
    userId,
    useConvexStorage = false,
  } = deps;

  try {
    const result = (await generateTextToImage({
      prompt: generationSettings.prompt,
    })) as { width: number; height: number; url: string };

    // Crop the generated image to 16:9 aspect ratio
    const { cropImageUrlToAspectRatio } = await import(
      "@/utils/image-crop-utils"
    );
    const croppedResult = await cropImageUrlToAspectRatio(result.url);

    // Add the generated image to the canvas immediately (Optimistic Update)
    const id = `generated-${Date.now()}-${Math.random()}`;

    const placement = calculateCenteredPlacement(
      canvasSize,
      viewport,
      croppedResult.width,
      croppedResult.height,
    );

    // 1. Show image immediately with Fal URL
    setImages((prev) => [
      ...prev,
      {
        id,
        src: croppedResult.croppedSrc, // Use Fal URL initially
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: placement.height,
        rotation: 0,
        isGenerated: true,
        naturalWidth: croppedResult.width,
        naturalHeight: croppedResult.height,
        isLoading: true, // Mark as loading/uploading
      },
    ]);

    // Select the new image
    setSelectedIds([id]);

    // 2. Upload to Convex in background
    // We don't await this promise so the UI stays responsive
    handleOptimisticUpload(
      croppedResult.croppedSrc,
      id,
      generationSettings,
      croppedResult.width,
      croppedResult.height,
      userId,
      useConvexStorage,
      setImages,
    );
  } catch (error) {
    showErrorFromException(
      "Generation failed",
      error,
      "Failed to generate image",
    );
  }
};

const processImageVariation = async (
  img: PlacedImage,
  deps: GenerationHandlerDeps,
): Promise<boolean> => {
  const {
    generationSettings,
    setImages,
    setActiveGenerations,
    userId,
  } = deps;

  try {
    // Convert image to blob for upload
    const blob = await convertImageToBlob(img.src);

    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve) => {
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(blob);
    });

    let uploadResult;
    try {
      uploadResult = await uploadImageDirect(dataUrl, userId);
    } catch (_uploadError) {
      return false;
    }

    // Only proceed with generation if upload succeeded
    if (!uploadResult?.url) {
      return false;
    }

    // Calculate output size maintaining aspect ratio
    // We can use the blob size or image dimensions
    const imgElement = new window.Image();
    imgElement.src = dataUrl;

    await new Promise((resolve) => {
      imgElement.onload = resolve;
    });

    const aspectRatio = imgElement.naturalWidth / imgElement.naturalHeight;
    const baseSize = 512;

    let _outputWidth = baseSize;
    let _outputHeight = baseSize;

    if (aspectRatio > 1) {
      _outputHeight = Math.round(baseSize / aspectRatio);
    } else {
      _outputWidth = Math.round(baseSize * aspectRatio);
    }

    const groupId = `single-${Date.now()}-${Math.random()}`;

    addImageToCanvasState(
      uploadResult.url,
      img.x + img.width + 20,
      img.y,
      groupId,
      generationSettings,
      setImages,
      setActiveGenerations,
      img.width,
      img.height,
    );
    return true;
  } catch (error) {
    showErrorFromException(
      "Failed to process image",
      error,
      "Failed to process image",
    );
    return false;
  }
};

const handleImageToImage = async (
  selectedImages: PlacedImage[],
  deps: GenerationHandlerDeps,
) => {
  const { setIsGenerating } = deps;

  let _successCount = 0;
  let _failureCount = 0;

  for (const img of selectedImages) {
    const success = await processImageVariation(img, deps);

    if (success) {
      _successCount++;
    } else {
      _failureCount++;
    }
  }

  // Done processing all images
  setIsGenerating(false);
};

export const handleRun = async (deps: GenerationHandlerDeps) => {
  const {
    images,
    selectedIds,
    generationSettings,
    setIsGenerating,
  } = deps;

  if (!generationSettings.prompt) {
    showError("No Prompt", "Please enter a prompt to generate an image");
    return;
  }

  setIsGenerating(true);
  const selectedImages = images.filter((img) => selectedIds.includes(img.id));

  // If no images are selected, do text-to-image generation
  if (selectedImages.length === 0) {
    await handleTextToImage(deps);
    setIsGenerating(false);
    return;
  }

  // Process each selected image individually for image-to-image
  await handleImageToImage(selectedImages, deps);
};
