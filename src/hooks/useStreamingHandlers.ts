import { ANIMATION, CANVAS_STRINGS } from "@/constants/canvas";
import {
  dismissToast,
  handleVideoCompletion,
} from "@/lib/handlers/video-generation-handlers";
import { createLogger } from "@/lib/logger";
import { showError, showErrorFromException, showSuccess } from "@/lib/toast";
import { generateThumbnail } from "@/lib/utils/generate-thumbnail";
import { blobToDataUrl } from "@/lib/utils/image-utils";
import type {
  ActiveGeneration,
  ActiveVideoGeneration,
  PlacedImage,
  PlacedVideo,
} from "@/types/canvas";
import { useCallback } from "react";
import { tryPromise, isErr } from "@/lib/errors/safe-errors";

const log = createLogger("StreamingHandler");

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
  videos: PlacedVideo[];
}

/**
 * Streaming handler return type
 */
interface StreamingHandlers {
  handleStreamingImageComplete: (
    id: string,
    finalUrl: string,
    thumbnailUrl?: string
  ) => Promise<void>;
  handleStreamingImageError: (
    id: string,
    error: string,
    isContentError?: boolean
  ) => void;
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
  } = deps;

  const handleStreamingImageComplete = useCallback(
    async (id: string, finalUrl: string, serverThumbnailUrl?: string) => {
      const isVariation = id.startsWith("variation-");

      let variationBatchTimestamp: string | null = null;
      if (isVariation) {
        const match = id.match(/^variation-(\d+)-\d+$/);
        if (match) {
          variationBatchTimestamp = match[1];
        }
      }

      const generation = activeGenerations.get(id);

      // Crop the generated/variation image to 16:9 aspect ratio
      let croppedUrl = finalUrl;
      let croppedThumbnailUrl = serverThumbnailUrl;

      try {
        const { cropImageUrlToAspectRatio } = await import(
          "@/utils/image-crop-utils"
        );
        const croppedResult = await cropImageUrlToAspectRatio(finalUrl);
        croppedUrl = croppedResult.croppedSrc;

        // Also crop the thumbnail if provided
        if (serverThumbnailUrl) {
          const croppedThumbResult =
            await cropImageUrlToAspectRatio(serverThumbnailUrl);
          croppedThumbnailUrl = croppedThumbResult.croppedSrc;
        }
      } catch (error) {
        log.warn("Failed to crop generated image", { data: error });
        // Continue with original URLs if cropping fails
      }

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
            img.src = croppedThumbnailUrl || croppedUrl;
          });
          naturalWidth = img.naturalWidth;
          naturalHeight = img.naturalHeight;
        } catch (error) {
          log.warn("Failed to extract dimensions from image", { data: error });
        }
      }

      // Get directorName, cameraAngle, and lightingScenario from the latest image state
      // Use a synchronous state read to ensure we have the latest value
      let directorName: string | undefined;
      let cameraAngle: string | undefined;
      let lightingScenario: string | undefined;

      setImages((prevImages) => {
        const currentImage = prevImages.find((img) => img.id === id);
        directorName = currentImage?.directorName;
        cameraAngle = currentImage?.cameraAngle;
        lightingScenario = currentImage?.lightingScenario;
        return prevImages; // No state change, just reading
      });

      // UX IMPROVEMENT: Update canvas IMMEDIATELY with generated image (non-blocking)
      const shouldDisplayInitialThumbnail = Boolean(croppedThumbnailUrl);
      const initialDisplaySrc = shouldDisplayInitialThumbnail && croppedThumbnailUrl
        ? croppedThumbnailUrl
        : croppedUrl;

      setImages((prev) =>
        prev.map((img) =>
          img.id === id
            ? {
              ...img,
              cameraAngle,
              directorName,
              lightingScenario,
              displayAsThumbnail: shouldDisplayInitialThumbnail,
              isLoading: false,
              naturalHeight,
              naturalWidth,
              opacity: 1.0,
              src: initialDisplaySrc,
              thumbnailSrc: shouldDisplayInitialThumbnail ? croppedThumbnailUrl : undefined,
              // Keep fullSizeSrc as croppedUrl temporarily until Convex upload completes
              fullSizeSrc: croppedUrl,
            }
            : img
        )
      );

      // Upload to Convex in background (non-blocking for UX)
      if (isAuthenticated) {
        (async () => {
          try {
            const { uploadGeneratedAssetToConvex } = await import(
              "@/lib/storage/upload-generated-asset"
            );

            const uploadResult = await uploadGeneratedAssetToConvex({
              assetType: "image",
              metadata: {
                cameraAngle,
                directorName,
                height: naturalHeight,
                lightingScenario,
                prompt: generation?.prompt,
                width: naturalWidth,
              },
              sourceUrl: croppedUrl,
            });

            // Update canvas with permanent Convex URLs after upload completes
            const convexUrl = uploadResult.url;
            const convexThumbnailUrl = uploadResult.thumbnailUrl || croppedThumbnailUrl;
            const assetId = uploadResult.assetId;
            const assetSyncedAt = Date.now();

            const shouldDisplayThumbnail = Boolean(convexThumbnailUrl);
            const displaySrc = shouldDisplayThumbnail && convexThumbnailUrl
              ? convexThumbnailUrl
              : convexUrl;

            setImages((prev) =>
              prev.map((img) =>
                img.id === id
                  ? {
                    ...img,
                    assetId,
                    assetSyncedAt,
                    displayAsThumbnail: shouldDisplayThumbnail,
                    fullSizeSrc: convexUrl,
                    src: displaySrc,
                    thumbnailSrc: shouldDisplayThumbnail ? convexThumbnailUrl : undefined,
                  }
                  : img
              )
            );

            // Save to storage after Convex upload completes
            setTimeout(() => saveToStorage(), ANIMATION.SAVE_DELAY);
          } catch (error) {
            log.error("Failed to upload image to Convex", { data: error });
            // Even if upload fails, the image is already on canvas with FAL URL
          }
        })();
      }

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
      isAuthenticated,
      saveToStorage,
      setActiveGenerations,
      setImages,
      setIsGenerating,
      setSelectedIds,
    ]
  );

  const handleStreamingImageError = useCallback(
    async (id: string, error: string, isContentError?: boolean) => {
      const errorMessage = error?.trim() || "Unknown error";

      // Always show error overlay for all generation failures (content errors and regular errors)
      const image = images.find((img) => img.id === id);

      if (image) {
        try {
          // Generate error overlay from pixelated source or original source
          const { createErrorOverlayFromUrl } = await import(
            "@/utils/image-error-overlay"
          );

          const sourceUrl = image.pixelatedSrc || image.src;
          const errorOverlayUrl = await createErrorOverlayFromUrl(
            sourceUrl,
            image.width,
            image.height
          );

          if (errorOverlayUrl) {
            // Update image with error overlay
            setImages((prev) =>
              prev.map((img) =>
                img.id === id
                  ? {
                    ...img,
                    hasContentError: isContentError || false,
                    hasGenerationError: !isContentError,
                    isLoading: false,
                    opacity: 1.0,
                    pixelatedSrc: undefined,
                    src: errorOverlayUrl,
                  }
                  : img
              )
            );
          } else {
            // Fallback: remove image if overlay generation fails
            setImages((prev) => prev.filter((img) => img.id !== id));
          }
        } catch (overlayError) {
          log.warn("Failed to create error overlay", { data: overlayError });
          // Fallback: remove image
          setImages((prev) => prev.filter((img) => img.id !== id));
        }
      } else {
        // If image not found, just remove it from active generations
        setImages((prev) => prev.filter((img) => img.id !== id));
      }

      setActiveGenerations((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);

        if (newMap.size === 0) {
          setIsGenerating(false);
        }

        return newMap;
      });

      // Show appropriate error message
      if (isContentError) {
        showError(
          "Content validation failed",
          "The generated content was flagged by content moderation and cannot be displayed."
        );
      } else {
        const isVariation = id.startsWith("variation-");

        showError(
          isVariation
            ? "Variation failed"
            : CANVAS_STRINGS.ERRORS.GENERATION_FAILED,
          isVariation ? "One variation failed to generate" : errorMessage
        );
      }
    },
    [images, setActiveGenerations, setImages, setIsGenerating]
  );

  const handleStreamingImageUpdate = useCallback(
    async (id: string, url: string) => {
      try {
        // Crop the streaming image to 16:9
        const { cropImageUrlToAspectRatio } = await import(
          "@/utils/image-crop-utils"
        );
        const croppedResult = await cropImageUrlToAspectRatio(url);

        // Download and generate thumbnail for streaming update
        const fetchResult = await tryPromise(fetch(croppedResult.croppedSrc));
        if (isErr(fetchResult)) {
          throw new Error("Failed to fetch cropped image");
        }

        const blobResult = await tryPromise(fetchResult.blob());
        if (isErr(blobResult)) {
          throw new Error("Failed to convert to blob");
        }

        const blob = blobResult;
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
                  src: croppedResult.croppedSrc,
                }
                : img
            )
          );
        }
      } catch (error) {
        log.warn("Failed to crop/generate streaming thumbnail", {
          data: error,
        });
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
          log.warn("Failed to extract dimensions from video", { data: error });
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
            log.error("Failed to upload video to Convex", { data: error });
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
            showSuccess(
              "Video variations complete",
              "All 4 cinematic videos have been generated"
            );
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
          showSuccess(CANVAS_STRINGS.SUCCESS.VIDEO_CREATED);
        }

        setActiveVideoGenerations((prev) => {
          const newMap = new Map(prev);
          newMap.delete(videoId);
          return newMap;
        });
        setIsConvertingToVideo(false);
        setSelectedImageForVideo(null);
      } catch (error) {
        log.error("Error completing video generation", { data: error });
        showErrorFromException(
          CANVAS_STRINGS.ERRORS.VIDEO_CREATION_FAILED,
          error,
          CANVAS_STRINGS.ERRORS.VIDEO_FAILED
        );
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
    ]
  );

  const handleVideoGenerationError = useCallback(
    (videoId: string, error: string) => {
      const errorMessage =
        error || "Unknown error occurred during video generation";

      showError(CANVAS_STRINGS.ERRORS.VIDEO_GENERATION_FAILED, errorMessage);

      setActiveVideoGenerations((prev) => {
        const newMap = new Map(prev);
        newMap.delete(videoId);
        return newMap;
      });
    },
    [setActiveVideoGenerations]
  );

  const handleVideoGenerationProgress = useCallback(
    (videoId: string, progress: number, status: string) => {
      log.debug("Video generation progress", {
        data: { videoId, progress, status },
      });
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
