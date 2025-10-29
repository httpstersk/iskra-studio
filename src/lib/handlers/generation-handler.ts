import type {
  ActiveGeneration,
  GenerationSettings,
  PlacedImage,
} from "@/types/canvas";
import type { FalClient } from "@fal-ai/client";
import { showError, showErrorFromException } from "@/lib/toast";
import { downloadAndReupload } from "./asset-download-handler";
import { createStorageService } from "@/lib/storage";

interface GenerationHandlerDeps {
  images: PlacedImage[];
  selectedIds: string[];
  generationSettings: GenerationSettings;
  canvasSize: { width: number; height: number };
  viewport: { x: number; y: number; scale: number };
  falClient: FalClient;
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

export const uploadImageDirect = async (
  dataUrl: string,
  userId: string | undefined
) => {
  // Convert data URL to blob first
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  try {
    // Upload to Convex storage
    if (!userId) {
      throw new Error("User ID required for upload");
    }

    const storage = createStorageService();
    const uploadResult = await storage.upload(blob, {
      userId,
      type: "image",
      mimeType: blob.type || "image/png",
      metadata: {},
    });

    return { url: uploadResult.url };
  } catch (error: unknown) {
    showErrorFromException("Failed to upload image", error, "Unknown error");

    // Re-throw the error so calling code knows upload failed
    throw error;
  }
};

export const generateImage = (
  imageUrl: string,
  x: number,
  y: number,
  groupId: string,
  generationSettings: GenerationSettings,
  setImages: GenerationHandlerDeps["setImages"],
  setActiveGenerations: GenerationHandlerDeps["setActiveGenerations"],
  width: number = 300,
  height: number = 300
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
    })
  );
};

export const handleRun = async (deps: GenerationHandlerDeps) => {
  const {
    images,
    selectedIds,
    generationSettings,
    canvasSize,
    viewport,
    setImages,
    setSelectedIds,
    setActiveGenerations,
    setIsGenerating,
    generateTextToImage,
    userId,
    useConvexStorage = false,
  } = deps;

  if (!generationSettings.prompt) {
    showError("No Prompt", "Please enter a prompt to generate an image");
    return;
  }

  setIsGenerating(true);
  const selectedImages = images.filter((img) => selectedIds.includes(img.id));

  // If no images are selected, do text-to-image generation
  if (selectedImages.length === 0) {
    try {
      const result = (await generateTextToImage({
        prompt: generationSettings.prompt,
      })) as { width: number; height: number; url: string };

      // Crop the generated image to 16:9 aspect ratio
      const { cropImageUrlToAspectRatio } = await import(
        "@/utils/image-crop-utils"
      );
      const croppedResult = await cropImageUrlToAspectRatio(result.url);

      // Migrate to Convex storage if enabled and userId is provided
      let finalUrl = croppedResult.croppedSrc;

      if (useConvexStorage && userId) {
        try {
          const migrationResult = await downloadAndReupload(
            croppedResult.croppedSrc,
            {
              userId,
              type: "image",
              mimeType: "image/jpeg",
              metadata: {
                prompt: generationSettings.prompt,
                width: croppedResult.width,
                height: croppedResult.height,
              },
            }
          );
          finalUrl = migrationResult.url;
        } catch (error) {
          // Continue with cropped data URL if migration fails
        }
      }

      // Add the generated image to the canvas
      const id = `generated-${Date.now()}-${Math.random()}`;

      // Place at center of viewport
      const viewportCenterX =
        (canvasSize.width / 2 - viewport.x) / viewport.scale;
      const viewportCenterY =
        (canvasSize.height / 2 - viewport.y) / viewport.scale;

      // Preserve aspect ratio while limiting the longest side to 512px
      const maxDisplay = 512;
      const scale = Math.min(
        maxDisplay / Math.max(croppedResult.width, 1),
        maxDisplay / Math.max(croppedResult.height, 1),
        1
      );
      const width = Math.max(1, Math.round(croppedResult.width * scale));
      const height = Math.max(1, Math.round(croppedResult.height * scale));

      setImages((prev) => [
        ...prev,
        {
          id,
          src: finalUrl,
          x: viewportCenterX - width / 2,
          y: viewportCenterY - height / 2,
          width,
          height,
          rotation: 0,
          isGenerated: true,
          naturalWidth: croppedResult.width,
          naturalHeight: croppedResult.height,
        },
      ]);

      // Select the new image
      setSelectedIds([id]);
    } catch (error) {
      showErrorFromException(
        "Generation failed",
        error,
        "Failed to generate image"
      );
    } finally {
      setIsGenerating(false);
    }
    return;
  }

  // Process each selected image individually for image-to-image
  let successCount = 0;
  let failureCount = 0;

  for (const img of selectedImages) {
    try {
      // Load the image
      const imgElement = new window.Image();
      imgElement.crossOrigin = "anonymous"; // Enable CORS
      imgElement.src = img.src;
      await new Promise((resolve) => {
        imgElement.onload = resolve;
      });

      // Create a canvas for the image at original resolution
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Failed to get canvas context");

      // Set canvas size to the original resolution (not display size)
      canvas.width = imgElement.naturalWidth;
      canvas.height = imgElement.naturalHeight;

      ctx.drawImage(imgElement, 0, 0);

      // Convert to blob and upload
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => resolve(blob!), "image/png");
      });

      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(blob);
      });

      let uploadResult;
      try {
        uploadResult = await uploadImageDirect(dataUrl, userId);
      } catch (uploadError) {
        failureCount++;
        // Skip this image if upload fails
        continue;
      }

      // Only proceed with generation if upload succeeded
      if (!uploadResult?.url) {
        failureCount++;
        continue;
      }

      // Calculate output size maintaining aspect ratio
      const aspectRatio = canvas.width / canvas.height;
      const baseSize = 512;
      let outputWidth = baseSize;
      let outputHeight = baseSize;

      if (aspectRatio > 1) {
        outputHeight = Math.round(baseSize / aspectRatio);
      } else {
        outputWidth = Math.round(baseSize * aspectRatio);
      }

      const groupId = `single-${Date.now()}-${Math.random()}`;
      generateImage(
        uploadResult.url,
        img.x + img.width + 20,
        img.y,
        groupId,
        generationSettings,
        setImages,
        setActiveGenerations,
        img.width,
        img.height
      );
      successCount++;
    } catch (error) {
      failureCount++;
      showErrorFromException(
        "Failed to process image",
        error,
        "Failed to process image"
      );
    }
  }

  // Done processing all images
  setIsGenerating(false);
};
