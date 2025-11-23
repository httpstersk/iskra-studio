import { ANIMATION, CANVAS_STRINGS } from "@/constants/canvas";
import {
  dismissToast,
  handleVideoCompletion,
} from "@/lib/handlers/video-generation-handlers";
import { createLogger } from "@/lib/logger";
import { showError, showErrorFromException, showSuccess } from "@/lib/toast";
import type {
  ActiveGeneration,
  ActiveVideoGeneration,
  PlacedImage,
  PlacedVideo,
} from "@/types/canvas";
import { useCallback } from "react";

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

  const handleStreamingImageError = useCallback(
    async (id: string, error: string, isContentError?: boolean) => {
      const errorMessage = error?.trim() || "Unknown error";

      // Always show error overlay for all generation failures (content errors and regular errors)
      const image = images.find((img) => img.id === id);

      if (image) {
        try {
          // Generate error overlay from pixelated source or original source
          // createErrorOverlayFromUrl always returns a valid overlay (uses fallback if source fails)
          const { createErrorOverlayFromUrl } = await import(
            "@/utils/image-error-overlay"
          );

          const sourceUrl = image.pixelatedSrc || image.src;
          const errorOverlayUrl = await createErrorOverlayFromUrl(
            sourceUrl,
            image.width,
            image.height
          );

          // Update image with error overlay (always succeeds with fallback)
          setImages((prev) =>
            prev.map((img) =>
              img.id === id
                ? {
                    ...img,
                    hasContentError: isContentError || false,
                    hasGenerationError: !isContentError,
                    isLoading: false,
                    opacity: 1.0,
                    pixelatedSrc: errorOverlayUrl,
                    src: errorOverlayUrl,
                  }
                : img
            )
          );
        } catch (overlayError) {
          log.warn("Failed to create error overlay", { data: overlayError });
          // Fallback: use createFallbackErrorOverlay directly
          const { createFallbackErrorOverlay } = await import(
            "@/utils/image-error-overlay"
          );
          const fallbackOverlay = createFallbackErrorOverlay(
            image.width,
            image.height
          );
          setImages((prev) =>
            prev.map((img) =>
              img.id === id
                ? {
                    ...img,
                    hasContentError: isContentError || false,
                    hasGenerationError: !isContentError,
                    isLoading: false,
                    opacity: 1.0,
                    pixelatedSrc: fallbackOverlay,
                    src: fallbackOverlay,
                  }
                : img
            )
          );
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

      // Validate that the image URL is accessible before proceeding
      // This catches 404 errors and other load failures early
      let imageLoadValidated = false;
      let croppedUrl = finalUrl;
      let croppedThumbnailUrl = serverThumbnailUrl;

      try {
        const { cropImageUrlToAspectRatio } = await import(
          "@/utils/image-crop-utils"
        );
        const croppedResult = await cropImageUrlToAspectRatio(finalUrl);
        croppedUrl = croppedResult.croppedSrc;
        imageLoadValidated = true; // Cropping succeeded, image is valid

        // Also crop the thumbnail if provided
        if (serverThumbnailUrl) {
          const croppedThumbResult =
            await cropImageUrlToAspectRatio(serverThumbnailUrl);
          croppedThumbnailUrl = croppedThumbResult.croppedSrc;
        }
      } catch (error) {
        log.warn("Failed to crop generated image", { data: error });
        // Image cropping failed - could be 404 or CORS error
        // Try to validate the original URL directly
      }

      let naturalWidth: number | undefined;
      let naturalHeight: number | undefined;

      if (generation?.imageSize && typeof generation.imageSize === "object") {
        naturalWidth = generation.imageSize.width;
        naturalHeight = generation.imageSize.height;
      }

      // If cropping didn't validate the image, try loading it directly
      if (!imageLoadValidated || !naturalWidth || !naturalHeight) {
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
          imageLoadValidated = true;
        } catch (error) {
          log.warn("Failed to load generated image (possible 404)", {
            data: error,
          });
        }
      }

      // If image validation failed, treat as error and show error overlay
      if (!imageLoadValidated) {
        log.error("Generated image URL is inaccessible (404 or CORS error)", {
          data: { id, finalUrl },
        });
        // Delegate to error handler which will show the error overlay
        handleStreamingImageError(
          id,
          "Generated image failed to load (404)",
          false
        );
        return;
      }

      // Get variation metadata from the latest image state
      // Use a synchronous state read to ensure we have the latest value
      let directorName: string | undefined;
      let cameraAngle: string | undefined;
      let lightingScenario: string | undefined;
      let emotion: string | undefined;
      let characterVariation: string | undefined;
      let storylineLabel: string | undefined;
      let variationType: string | undefined;

      setImages((prevImages) => {
        const currentImage = prevImages.find((img) => img.id === id);
        directorName = currentImage?.directorName;
        cameraAngle = currentImage?.cameraAngle;
        lightingScenario = currentImage?.lightingScenario;
        emotion = currentImage?.emotion;
        characterVariation = currentImage?.characterVariation;
        storylineLabel = currentImage?.storylineLabel;
        variationType = currentImage?.variationType;
        return prevImages; // No state change, just reading
      });

      // UX IMPROVEMENT: Update canvas IMMEDIATELY with generated image (non-blocking)
      // We now prefer the full quality image immediately as requested
      const initialDisplaySrc = croppedUrl;

      setImages((prev) =>
        prev.map((img) =>
          img.id === id
            ? {
                ...img,
                cameraAngle,
                characterVariation,
                directorName,
                displayAsThumbnail: false, // Don't show thumbnail initially
                emotion,
                fullSizeSrc: croppedUrl,
                isLoading: false,
                lightingScenario,
                naturalHeight,
                naturalWidth,
                opacity: 1.0,
                originalFalUrl: finalUrl, // Store original FAL URL for high-quality downloads
                src: initialDisplaySrc,
                storylineLabel,
                thumbnailSrc: undefined, // Don't set thumbnail initially
                variationType,
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
                characterVariation,
                directorName,
                emotion,
                height: naturalHeight,
                lightingScenario,
                prompt: generation?.prompt,
                storylineLabel,
                variationType,
                width: naturalWidth,
              },
              sourceUrl: croppedUrl,
            });

            // Update canvas with permanent Convex URLs after upload completes
            const convexUrl = uploadResult.url;
            const convexThumbnailUrl =
              uploadResult.thumbnailUrl || croppedThumbnailUrl;
            const assetId = uploadResult.assetId;
            const assetSyncedAt = Date.now();

            // OPTIMIZATION: Keep showing the Data URL (croppedUrl) to avoid a new network request
            // But save the Convex URL in fullSizeSrc so it persists to the DB
            // The next time the app loads, it will use fullSizeSrc/src from the DB
            const displaySrc = croppedUrl;

            setImages((prev) =>
              prev.map((img) =>
                img.id === id
                  ? {
                      ...img,
                      assetId,
                      assetSyncedAt,
                      displayAsThumbnail: false,
                      fullSizeSrc: convexUrl, // Save permanent URL here
                      src: displaySrc, // Keep showing Data URL for now
                      thumbnailSrc: convexThumbnailUrl,
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
      handleStreamingImageError,
      isAuthenticated,
      saveToStorage,
      setActiveGenerations,
      setImages,
      setIsGenerating,
      setSelectedIds,
    ]
  );

  const handleStreamingImageUpdate = useCallback(
    async (id: string, url: string) => {
      try {
        // Crop the streaming image to 16:9
        const { cropImageUrlToAspectRatio } = await import(
          "@/utils/image-crop-utils"
        );
        const croppedResult = await cropImageUrlToAspectRatio(url);

        setImages((prev) =>
          prev.map((img) =>
            img.id === id
              ? {
                  ...img,
                  displayAsThumbnail: false,
                  src: croppedResult.croppedSrc,
                }
              : img
          )
        );
      } catch (error) {
        log.warn("Failed to crop streaming image", {
          data: error,
        });
        // Fallback to original behavior
        setImages((prev) =>
          prev.map((img) =>
            img.id === id
              ? {
                  ...img,
                  displayAsThumbnail: false,
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
