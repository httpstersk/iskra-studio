import { ANIMATION, CANVAS_STRINGS } from "@/constants/canvas";
import {
  dismissToast,
  handleVideoCompletion,
} from "@/lib/handlers/video-generation-handlers";
import { generateThumbnail } from "@/lib/utils/generate-thumbnail";
import { blobToDataUrl } from "@/lib/utils/image-utils";
import type {
  ActiveGeneration,
  ActiveVideoGeneration,
  PlacedImage,
  PlacedVideo,
} from "@/types/canvas";
import { useCallback } from "react";

/**
 * Toast function type
 */
type ToastFn = (options: {
  description?: string;
  title?: string;
  variant?: "default" | "destructive";
}) => void;

/**
 * Streaming handler dependencies
 */
interface StreamingHandlerDeps {
  activeGenerations: Map<string, ActiveGeneration>;
  activeVideoGenerations: Map<string, ActiveVideoGeneration>;
  images: PlacedImage[];
  isAuthenticated: boolean;
  saveToHistory: () => void;
  saveToStorage: () => void;
  selectedImageForVideo: string | null;
  setActiveGenerations: (
    updater: (
      prev: Map<string, ActiveGeneration>
    ) => Map<string, ActiveGeneration>
  ) => void;
  setActiveVideoGenerations: (
    updater: (
      prev: Map<string, ActiveVideoGeneration>
    ) => Map<string, ActiveVideoGeneration>
  ) => void;
  setImages: (updater: (prev: PlacedImage[]) => PlacedImage[]) => void;
  setIsConvertingToVideo: (value: boolean) => void;
  setIsGenerating: (value: boolean) => void;
  setSelectedIds: (ids: string[]) => void;
  setSelectedImageForVideo: (id: string | null) => void;
  setVideos: (updater: (prev: PlacedVideo[]) => PlacedVideo[]) => void;
  toast: ToastFn;
  videos: PlacedVideo[];
}

/**
 * Streaming handler return type
 */
interface StreamingHandlers {
  handleStreamingImageComplete: (id: string, finalUrl: string) => Promise<void>;
  handleStreamingImageError: (id: string, error: string) => void;
  handleStreamingImageUpdate: (id: string, url: string) => Promise<void>;
  handleVideoGenerationComplete: (
    videoId: string,
    videoUrl: string,
    duration: number
  ) => Promise<void>;
  handleVideoGenerationError: (videoId: string, error: string) => void;
  handleVideoGenerationProgress: (
    videoId: string,
    progress: number,
    status: string
  ) => void;
}

/**
 * Custom hook for managing streaming generation handlers
 *
 * Extracts streaming image and video completion/error handlers from the main
 * canvas component to improve separation of concerns and testability.
 *
 * @param deps - Streaming handler dependencies
 * @returns Streaming event handlers
 */
export function useStreamingHandlers(
  deps: StreamingHandlerDeps
): StreamingHandlers {
  const {
    activeGenerations,
    activeVideoGenerations,
    images,
    isAuthenticated,
    saveToHistory,
    saveToStorage,
    selectedImageForVideo,
    setActiveGenerations,
    setActiveVideoGenerations,
    setImages,
    setIsConvertingToVideo,
    setIsGenerating,
    setSelectedIds,
    setSelectedImageForVideo,
    setVideos,
    toast,
    videos,
  } = deps;

  const handleStreamingImageComplete = useCallback(
    async (id: string, finalUrl: string) => {
      const isVariation = id.startsWith("variation-");

      let variationBatchTimestamp: string | null = null;
      if (isVariation) {
        const match = id.match(/^variation-(\d+)-\d+$/);
        if (match) {
          variationBatchTimestamp = match[1];
        }
      }

      const generation = activeGenerations.get(id);

      let naturalWidth: number | undefined;
      let naturalHeight: number | undefined;

      if (generation?.imageSize && typeof generation.imageSize === "object") {
        naturalWidth = generation.imageSize.width;
        naturalHeight = generation.imageSize.height;
      }

      if (!naturalWidth || !naturalHeight) {
        try {
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = finalUrl;
          });
          naturalWidth = img.naturalWidth;
          naturalHeight = img.naturalHeight;
        } catch (error) {
          console.warn("Failed to extract dimensions from image:", error);
        }
      }

      let convexUrl = finalUrl;
      let thumbnailUrl: string | undefined;

      if (isAuthenticated) {
        try {
          const { uploadGeneratedAssetToConvex } = await import(
            "@/lib/storage/upload-generated-asset"
          );

          const uploadResult = await uploadGeneratedAssetToConvex({
            assetType: "image",
            metadata: {
              height: naturalHeight,
              prompt: generation?.prompt,
              width: naturalWidth,
            },
            sourceUrl: finalUrl,
          });

          convexUrl = uploadResult.url;
          thumbnailUrl = uploadResult.thumbnailUrl;
        } catch (error) {
          console.error(
            `[Image Generation] Failed to upload to Convex:`,
            error
          );
        }
      }

      setImages((prev) =>
        prev.map((img) =>
          img.id === id
            ? {
                ...img,
                displayAsThumbnail: !!thumbnailUrl && !img.pixelatedSrc,
                fullSizeSrc: thumbnailUrl ? convexUrl : undefined,
                isLoading: false,
                naturalHeight,
                naturalWidth,
                opacity: 1.0,
                src: thumbnailUrl || convexUrl,
                thumbnailSrc: thumbnailUrl,
              }
            : img
        )
      );

      setActiveGenerations((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);

        if (variationBatchTimestamp && newMap.size > 0) {
          const hasMoreFromBatch = Array.from(newMap.keys()).some((key) =>
            key.startsWith(`variation-${variationBatchTimestamp}-`)
          );

          if (!hasMoreFromBatch) {
            setSelectedIds([]);
          }
        }

        if (newMap.size === 0) {
          setIsGenerating(false);
          if (isVariation) {
            setSelectedIds([]);
          }
        }

        return newMap;
      });

      setTimeout(() => saveToStorage(), ANIMATION.SAVE_DELAY);
    },
    [
      activeGenerations,
      images,
      isAuthenticated,
      saveToStorage,
      setActiveGenerations,
      setImages,
      setIsGenerating,
      setSelectedIds,
    ]
  );

  const handleStreamingImageError = useCallback(
    (id: string, error: string) => {
      console.error(`Generation error for ${id}:`, error);

      setImages((prev) => prev.filter((img) => img.id !== id));

      setActiveGenerations((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);

        if (newMap.size === 0) {
          setIsGenerating(false);
        }

        return newMap;
      });

      const isVariation = id.startsWith("variation-");
      toast({
        description: isVariation ? "One variation failed to generate" : error,
        title: isVariation
          ? "Variation failed"
          : CANVAS_STRINGS.ERRORS.GENERATION_FAILED,
        variant: "destructive",
      });
    },
    [setActiveGenerations, setImages, setIsGenerating, toast]
  );

  const handleStreamingImageUpdate = useCallback(
    async (id: string, url: string) => {
      try {
        // Download and generate thumbnail for streaming update
        const response = await fetch(url);
        const blob = await response.blob();
        const thumbnailBlob = await generateThumbnail(blob);
        
        if (thumbnailBlob) {
          const thumbnailDataUrl = await blobToDataUrl(thumbnailBlob);
          setImages((prev) =>
            prev.map((img) =>
              img.id === id
                ? {
                    ...img,
                    displayAsThumbnail: true,
                    src: thumbnailDataUrl,
                  }
                : img
            )
          );
        } else {
          // Fallback if thumbnail generation fails
          setImages((prev) =>
            prev.map((img) =>
              img.id === id
                ? {
                    ...img,
                    displayAsThumbnail: true,
                    src: url,
                  }
                : img
            )
          );
        }
      } catch (error) {
        console.warn("Failed to generate streaming thumbnail:", error);
        // Fallback to original behavior
        setImages((prev) =>
          prev.map((img) =>
            img.id === id
              ? {
                  ...img,
                  displayAsThumbnail: true,
                  src: url,
                }
              : img
          )
        );
      }
    },
    [setImages]
  );

  const handleVideoGenerationComplete = useCallback(
    async (videoId: string, videoUrl: string, duration: number) => {
      try {
        const generation = activeVideoGenerations.get(videoId);

        if (generation?.toastId) {
          dismissToast(generation.toastId);
        }

        let naturalWidth: number | undefined;
        let naturalHeight: number | undefined;

        try {
          const videoElement = document.createElement("video");
          videoElement.crossOrigin = "anonymous";
          await new Promise((resolve, reject) => {
            videoElement.onloadedmetadata = resolve;
            videoElement.onerror = reject;
            videoElement.src = videoUrl;
          });
          naturalWidth = videoElement.videoWidth;
          naturalHeight = videoElement.videoHeight;
        } catch (error) {
          console.warn("Failed to extract dimensions from video:", error);
        }

        let convexUrl = videoUrl;
        if (isAuthenticated) {
          try {
            const { uploadGeneratedAssetToConvex } = await import(
              "@/lib/storage/upload-generated-asset"
            );

            const uploadResult = await uploadGeneratedAssetToConvex({
              assetType: "video",
              metadata: {
                duration,
                height: naturalHeight,
                model: generation?.modelId,
                prompt: generation?.prompt,
                width: naturalWidth,
              },
              sourceUrl: videoUrl,
            });

            convexUrl = uploadResult.url;
          } catch (error) {
            console.error(
              `[Video Generation] Failed to upload to Convex:`,
              error
            );
          }
        }

        if (generation?.isVariation) {
          setVideos((prev) => {
            return prev.map((video) =>
              video.id === videoId
                ? {
                    ...video,
                    duration,
                    isLoading: false,
                    src: convexUrl,
                  }
                : video
            );
          });

          setActiveVideoGenerations((prev) => {
            const newMap = new Map(prev);
            newMap.delete(videoId);
            return newMap;
          });

          if (activeVideoGenerations.size === 1) {
            saveToHistory();
            toast({
              description: "All 4 cinematic videos have been generated",
              title: "Video variations complete",
            });
          }

          setIsConvertingToVideo(false);
          return;
        }

        const { newVideo } = handleVideoCompletion(
          videoId,
          convexUrl,
          duration,
          generation || null,
          images,
          selectedImageForVideo
        );

        if (newVideo) {
          setVideos((prev) => [...prev, newVideo]);
          saveToHistory();
          toast({
            title: CANVAS_STRINGS.SUCCESS.VIDEO_CREATED,
          });
        }

        setActiveVideoGenerations((prev) => {
          const newMap = new Map(prev);
          newMap.delete(videoId);
          return newMap;
        });
        setIsConvertingToVideo(false);
        setSelectedImageForVideo(null);
      } catch (error) {
        console.error("Error completing video generation:", error);
        toast({
          description:
            error instanceof Error
              ? error.message
              : CANVAS_STRINGS.ERRORS.VIDEO_FAILED,
          title: CANVAS_STRINGS.ERRORS.VIDEO_CREATION_FAILED,
          variant: "destructive",
        });
      }
    },
    [
      activeVideoGenerations,
      images,
      isAuthenticated,
      saveToHistory,
      selectedImageForVideo,
      setActiveVideoGenerations,
      setIsConvertingToVideo,
      setSelectedImageForVideo,
      setVideos,
      toast,
      videos,
    ]
  );

  const handleVideoGenerationError = useCallback(
    (videoId: string, error: string) => {
      console.error("Video generation error:", error);
      toast({
        description: error,
        title: CANVAS_STRINGS.ERRORS.VIDEO_GENERATION_FAILED,
        variant: "destructive",
      });
      setActiveVideoGenerations((prev) => {
        const newMap = new Map(prev);
        newMap.delete(videoId);
        return newMap;
      });
    },
    [setActiveVideoGenerations, toast]
  );

  const handleVideoGenerationProgress = useCallback(
    (videoId: string, progress: number, status: string) => {
      console.log(`Video generation progress: ${progress}% - ${status}`);
    },
    []
  );

  return {
    handleStreamingImageComplete,
    handleStreamingImageError,
    handleStreamingImageUpdate,
    handleVideoGenerationComplete,
    handleVideoGenerationError,
    handleVideoGenerationProgress,
  };
}
