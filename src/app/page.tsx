"use client";

/**
 * Canvas Page - Main application page
 * Provides an infinite canvas for image and video manipulation with AI generation capabilities
 */

import { useToast } from "@/hooks/use-toast";
import { useCanvasInteractions } from "@/hooks/useCanvasInteractions";
import { useCanvasState } from "@/hooks/useCanvasState-jotai";
import { useFalClient } from "@/hooks/useFalClient";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useGenerationState } from "@/hooks/useGenerationState-jotai";
import { useHistoryState } from "@/hooks/useHistoryState-jotai";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useStorage } from "@/hooks/useStorage";
import { useUIState } from "@/hooks/useUIState-jotai";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import Konva from "konva";
import { useTheme } from "next-themes";
import { useCallback, useRef } from "react";

// Components
import { CanvasContextMenu } from "@/components/canvas/CanvasContextMenu";
import { CanvasControlPanel } from "@/components/canvas/CanvasControlPanel";
import { CanvasDialogs } from "@/components/canvas/CanvasDialogs";
import { CanvasStageRenderer } from "@/components/canvas/CanvasStageRenderer";
import { DimensionDisplay } from "@/components/canvas/DimensionDisplay";
import { MiniMap } from "@/components/canvas/MiniMap";
import { StreamingImage } from "@/components/canvas/StreamingImage";
import { StreamingVideo } from "@/components/canvas/StreamingVideo";
import { VideoOverlays } from "@/components/canvas/VideoOverlays";
import { ZoomControls } from "@/components/canvas/ZoomControls";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";

// Handlers
import { handleRun as handleRunHandler } from "@/lib/handlers/generation-handler";
import { handleVariationGeneration } from "@/lib/handlers/variation-handler";
import {
  combineImages,
  deleteElements,
  duplicateElements,
} from "@/lib/handlers/image-handlers";
import {
  bringForward as bringForwardHandler,
  sendBackward as sendBackwardHandler,
  sendToBack as sendToBackHandler,
  sendToFront as sendToFrontHandler,
} from "@/lib/handlers/layer-handlers";
import {
  createGenerationId,
  createImageToVideoConfig,
  createVideoToVideoConfig,
  dismissToast,
  handleVideoCompletion,
  uploadMediaIfNeeded,
} from "@/lib/handlers/video-generation-handlers";

// Types & Utils
import {
  ANIMATION,
  ARIA_LABELS,
  CANVAS_DIMENSIONS,
  CANVAS_STRINGS,
} from "@/constants/canvas";
import { useDefaultImages } from "@/hooks/useDefaultImages";
import type { PlacedImage, VideoGenerationSettings } from "@/types/canvas";

/**
 * Main Canvas Page Component
 */
export default function CanvasPage() {
  // ========================================
  // External Hooks & Services
  // ========================================

  const { setTheme, theme } = useTheme();
  const { toast } = useToast();
  const falClient = useFalClient();
  const stageRef = useRef<Konva.Stage>(null);
  const trpc = useTRPC();

  // ========================================
  // State Management
  // ========================================

  const canvasState = useCanvasState();
  const generationState = useGenerationState();
  const historyState = useHistoryState(
    canvasState.images,
    canvasState.videos,
    canvasState.selectedIds
  );
  const uiState = useUIState();

  const interactions = useCanvasInteractions(
    canvasState.viewport,
    canvasState.setViewport,
    canvasState.canvasSize,
    canvasState.images,
    canvasState.videos,
    canvasState.selectedIds,
    canvasState.setSelectedIds
  );

  const { isStorageLoaded, saveToStorage } = useStorage(
    canvasState.images,
    canvasState.videos,
    canvasState.viewport,
    canvasState.setImages,
    canvasState.setVideos,
    canvasState.setViewport,
    generationState.activeGenerations.size
  );

  const { handleDrop, handleFileUpload } = useFileUpload(
    canvasState.setImages,
    canvasState.viewport,
    canvasState.canvasSize
  );

  // API mutations
  const { mutateAsync: generateTextToImage } = useMutation(
    trpc.generateTextToImage.mutationOptions()
  );

  // Load default images
  useDefaultImages(
    isStorageLoaded,
    canvasState.images.length,
    canvasState.canvasSize,
    canvasState.setImages
  );

  // ========================================
  // History Handlers
  // ========================================

  /**
   * Handles undo operation
   */
  const handleUndo = useCallback(() => {
    const result = historyState.undo();
    if (result) {
      canvasState.setImages(result.images);
      canvasState.setSelectedIds(result.selectedIds);
      canvasState.setVideos(result.videos);
      historyState.setHistoryIndex(result.newIndex);
    }
  }, [
    canvasState.setImages,
    canvasState.setSelectedIds,
    canvasState.setVideos,
    historyState,
  ]);

  /**
   * Handles redo operation
   */
  const handleRedo = useCallback(() => {
    const result = historyState.redo();
    if (result) {
      canvasState.setImages(result.images);
      canvasState.setSelectedIds(result.selectedIds);
      canvasState.setVideos(result.videos);
      historyState.setHistoryIndex(result.newIndex);
    }
  }, [
    canvasState.setImages,
    canvasState.setSelectedIds,
    canvasState.setVideos,
    historyState,
  ]);

  // ========================================
  // Image Manipulation Handlers (Alphabetized)
  // ========================================

  /**
   * Handles bringing an element forward in the layer stack
   */
  const handleBringForward = useCallback(() => {
    if (canvasState.selectedIds.length === 0) return;
    historyState.saveToHistory();
    canvasState.setImages(
      bringForwardHandler(canvasState.images, canvasState.selectedIds)
    );
  }, [canvasState, historyState]);

  /**
   * Handles combining multiple selected images into one
   */
  const handleCombineImages = useCallback(async () => {
    if (canvasState.selectedIds.length < 2) return;
    historyState.saveToHistory();

    try {
      const combinedImage = await combineImages(
        canvasState.images,
        canvasState.selectedIds
      );
      canvasState.setImages((prev) => [
        ...prev.filter((img) => !canvasState.selectedIds.includes(img.id)),
        combinedImage,
      ]);
      canvasState.setSelectedIds([combinedImage.id]);
    } catch (error) {
      console.error("Failed to combine images:", error);
      toast({
        description:
          error instanceof Error
            ? error.message
            : CANVAS_STRINGS.ERRORS.UNKNOWN_ERROR,
        title: CANVAS_STRINGS.ERRORS.COMBINE_FAILED,
        variant: "destructive",
      });
    }
  }, [canvasState, historyState, toast]);

  /**
   * Handles deleting selected elements
   */
  const handleDelete = useCallback(() => {
    historyState.saveToHistory();
    const { newImages, newVideos } = deleteElements(
      canvasState.images,
      canvasState.videos,
      canvasState.selectedIds
    );
    canvasState.setImages(newImages);
    canvasState.setSelectedIds([]);
    canvasState.setVideos(newVideos);
  }, [canvasState, historyState]);

  /**
   * Handles duplicating selected elements
   */
  const handleDuplicate = useCallback(() => {
    historyState.saveToHistory();
    const { newImages, newVideos } = duplicateElements(
      canvasState.images,
      canvasState.videos,
      canvasState.selectedIds
    );
    canvasState.setImages((prev) => [...prev, ...newImages]);
    canvasState.setVideos((prev) => [...prev, ...newVideos]);
    canvasState.setSelectedIds([
      ...newImages.map((img) => img.id),
      ...newVideos.map((vid) => vid.id),
    ]);
  }, [canvasState, historyState]);

  /**
   * Handles double-click on an image to cycle generation count (4 → 8 → 12 → 4)
   * Only works for image mode; video mode always uses 4
   */
  const handleImageDoubleClick = useCallback(
    (imageId: string) => {
      // Only cycle count if the image is selected and in image mode
      if (canvasState.selectedIds.includes(imageId) && uiState.variationMode === "image") {
        const currentCount = uiState.generationCount;
        let newCount: number;
        
        // Cycle: 4 → 8 → 12 → 4
        if (currentCount === 4) {
          newCount = 8;
        } else if (currentCount === 8) {
          newCount = 12;
        } else {
          newCount = 4;
        }
        
        uiState.setGenerationCount(newCount);
      }
    },
    [canvasState.selectedIds, uiState]
  );

  /**
   * Handles switching variation mode and ensures video mode always uses 4 variations
   */
  const handleVariationModeChange = useCallback((mode: "image" | "video") => {
    uiState.setVariationMode(mode);
    // Reset count to 4 when switching to video mode
    if (mode === "video") {
      uiState.setGenerationCount(4);
    }
  }, [uiState]);

  /**
   * Handles running image generation
   * If one image is selected with no prompt, generates variations based on mode and count
   * Otherwise, performs standard text-to-image or image-to-image generation
   */
  const handleRun = async () => {
    // Check if we're in variation mode: one image selected, no prompt
    const isVariationMode =
      canvasState.selectedIds.length === 1 &&
      !generationState.generationSettings.prompt.trim();

    if (isVariationMode) {
      // Generate variations based on mode and count
      await handleVariationGeneration({
        images: canvasState.images,
        selectedIds: canvasState.selectedIds,
        viewport: canvasState.viewport,
        falClient,
        setImages: canvasState.setImages,
        setIsGenerating: generationState.setIsGenerating,
        setIsApiKeyDialogOpen: uiState.setIsApiKeyDialogOpen,
        setActiveGenerations: generationState.setActiveGenerations,
        toast,
        variationPrompt: generationState.generationSettings.variationPrompt,
        variationMode: uiState.variationMode,
        variationCount: uiState.generationCount,
      });
    } else {
      // Standard generation flow
      await handleRunHandler({
        canvasSize: canvasState.canvasSize,
        customApiKey: uiState.customApiKey,
        falClient,
        generateTextToImage,
        generationSettings: generationState.generationSettings,
        images: canvasState.images,
        selectedIds: canvasState.selectedIds,
        setActiveGenerations: generationState.setActiveGenerations,
        setImages: canvasState.setImages,
        setIsApiKeyDialogOpen: uiState.setIsApiKeyDialogOpen,
        setIsGenerating: generationState.setIsGenerating,
        setSelectedIds: canvasState.setSelectedIds,
        toast,
        viewport: canvasState.viewport,
      });
    }
  };

  /**
   * Handles sending an element backward in the layer stack
   */
  const handleSendBackward = useCallback(() => {
    if (canvasState.selectedIds.length === 0) return;
    historyState.saveToHistory();
    canvasState.setImages(
      sendBackwardHandler(canvasState.images, canvasState.selectedIds)
    );
  }, [canvasState, historyState]);

  /**
   * Handles sending an element to the back of the layer stack
   */
  const handleSendToBack = useCallback(() => {
    if (canvasState.selectedIds.length === 0) return;
    historyState.saveToHistory();
    canvasState.setImages(
      sendToBackHandler(canvasState.images, canvasState.selectedIds)
    );
  }, [canvasState, historyState]);

  /**
   * Handles sending an element to the front of the layer stack
   */
  const handleSendToFront = useCallback(() => {
    if (canvasState.selectedIds.length === 0) return;
    historyState.saveToHistory();
    canvasState.setImages(
      sendToFrontHandler(canvasState.images, canvasState.selectedIds)
    );
  }, [canvasState, historyState]);

  // ========================================
  // Video Generation Handlers (Alphabetized)
  // ========================================

  /**
   * Opens dialog for converting an image to video
   */
  const handleConvertToVideo = (imageId: string) => {
    const image = canvasState.images.find((img) => img.id === imageId);
    if (!image) return;
    uiState.setIsImageToVideoDialogOpen(true);
    uiState.setSelectedImageForVideo(imageId);
  };

  /**
   * Opens dialog for extending a video
   */
  const handleExtendVideo = (videoId: string) => {
    uiState.setIsExtendVideoDialogOpen(true);
    uiState.setSelectedVideoForExtend(videoId);
  };

  /**
   * Handles image-to-video conversion
   */
  const handleImageToVideoConversion = async (
    settings: VideoGenerationSettings
  ) => {
    if (!uiState.selectedImageForVideo) return;
    const image = canvasState.images.find(
      (img) => img.id === uiState.selectedImageForVideo
    );
    if (!image) return;

    try {
      generationState.setIsConvertingToVideo(true);

      const imageUrl = await uploadMediaIfNeeded(image.src, falClient);
      const generationId = createGenerationId("img2vid");
      const config = createImageToVideoConfig(
        imageUrl,
        settings,
        uiState.selectedImageForVideo
      );

      generationState.setActiveVideoGenerations((prev) => {
        const newMap = new Map(prev);
        newMap.set(generationId, config);
        return newMap;
      });

      generationState.setIsConvertingToVideo(false);
      uiState.setIsImageToVideoDialogOpen(false);
    } catch (error) {
      console.error("Error starting image-to-video conversion:", error);
      toast({
        description:
          error instanceof Error
            ? error.message
            : CANVAS_STRINGS.ERRORS.CONVERSION_START_FAILED,
        title: CANVAS_STRINGS.ERRORS.CONVERSION_FAILED,
        variant: "destructive",
      });
      generationState.setIsConvertingToVideo(false);
    }
  };

  /**
   * Handles video extension
   */
  const handleVideoExtension = async (settings: VideoGenerationSettings) => {
    if (!uiState.selectedVideoForExtend) return;
    const video = canvasState.videos.find(
      (vid) => vid.id === uiState.selectedVideoForExtend
    );
    if (!video) return;

    try {
      generationState.setIsExtendingVideo(true);

      const videoUrl = await uploadMediaIfNeeded(video.src, falClient);
      const generationId = createGenerationId("vid_ext");
      const config = createVideoToVideoConfig(
        videoUrl,
        settings,
        video.duration,
        uiState.selectedVideoForExtend,
        true
      );

      generationState.setActiveVideoGenerations((prev) => {
        const newMap = new Map(prev);
        newMap.set(generationId, config);
        return newMap;
      });

      uiState.setIsExtendVideoDialogOpen(false);
    } catch (error) {
      console.error("Error starting video extension:", error);
      toast({
        description:
          error instanceof Error
            ? error.message
            : CANVAS_STRINGS.ERRORS.EXTENSION_START_FAILED,
        title: CANVAS_STRINGS.ERRORS.EXTENSION_FAILED,
        variant: "destructive",
      });
      generationState.setIsExtendingVideo(false);
    }
  };

  /**
   * Handles completion of video generation
   */
  const handleVideoGenerationComplete = async (
    videoId: string,
    videoUrl: string,
    duration: number
  ) => {
    try {
      const generation = generationState.activeVideoGenerations.get(videoId);

      if (generation?.toastId) {
        dismissToast(generation.toastId);
      }

      const { newVideo, sourceType } = handleVideoCompletion(
        videoId,
        videoUrl,
        duration,
        generation || null,
        canvasState.images,
        canvasState.videos,
        uiState.selectedImageForVideo
      );

      if (newVideo) {
        canvasState.setVideos((prev) => [...prev, newVideo]);
        historyState.saveToHistory();
        toast({
          title:
            sourceType === "image"
              ? CANVAS_STRINGS.SUCCESS.VIDEO_CREATED
              : CANVAS_STRINGS.SUCCESS.VIDEO_PROCESSED,
        });
      }

      generationState.setActiveVideoGenerations((prev) => {
        const newMap = new Map(prev);
        newMap.delete(videoId);
        return newMap;
      });
      generationState.setIsConvertingToVideo(false);
      uiState.setSelectedImageForVideo(null);
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
  };

  /**
   * Handles video generation error
   */
  const handleVideoGenerationError = (videoId: string, error: string) => {
    console.error("Video generation error:", error);
    toast({
      description: error,
      title: CANVAS_STRINGS.ERRORS.VIDEO_GENERATION_FAILED,
      variant: "destructive",
    });
    generationState.setActiveVideoGenerations((prev) => {
      const newMap = new Map(prev);
      newMap.delete(videoId);
      return newMap;
    });
  };

  /**
   * Handles video generation progress updates
   */
  const handleVideoGenerationProgress = (
    videoId: string,
    progress: number,
    status: string
  ) => {
    console.log(`Video generation progress: ${progress}% - ${status}`);
  };

  /**
   * Opens dialog for video-to-video transformation
   */
  const handleVideoToVideo = (videoId: string) => {
    uiState.setIsVideoToVideoDialogOpen(true);
    uiState.setSelectedVideoForVideo(videoId);
  };

  /**
   * Handles video-to-video transformation
   */
  const handleVideoToVideoTransformation = async (
    settings: VideoGenerationSettings
  ) => {
    if (!uiState.selectedVideoForVideo) return;
    const video = canvasState.videos.find(
      (vid) => vid.id === uiState.selectedVideoForVideo
    );
    if (!video) return;

    try {
      generationState.setIsTransformingVideo(true);

      const videoUrl = await uploadMediaIfNeeded(video.src, falClient);
      const generationId = createGenerationId("vid2vid");
      const config = createVideoToVideoConfig(
        videoUrl,
        settings,
        video.duration,
        uiState.selectedVideoForVideo
      );

      generationState.setActiveVideoGenerations((prev) => {
        const newMap = new Map(prev);
        newMap.set(generationId, config);
        return newMap;
      });

      uiState.setIsVideoToVideoDialogOpen(false);
    } catch (error) {
      console.error("Error starting video-to-video transformation:", error);
      toast({
        description:
          error instanceof Error
            ? error.message
            : CANVAS_STRINGS.ERRORS.TRANSFORMATION_START_FAILED,
        title: CANVAS_STRINGS.ERRORS.TRANSFORMATION_FAILED,
        variant: "destructive",
      });
      generationState.setIsTransformingVideo(false);
    }
  };

  // ========================================
  // Chat Handler
  // ========================================

  /**
   * Handles image generated from chat
   */
  const handleChatImageGenerated = useCallback(
    (imageUrl: string) => {
      const id = `chat-generated-${Date.now()}-${Math.random()}`;
      const viewportCenterX =
        (canvasState.canvasSize.width / 2 - canvasState.viewport.x) /
        canvasState.viewport.scale;
      const viewportCenterY =
        (canvasState.canvasSize.height / 2 - canvasState.viewport.y) /
        canvasState.viewport.scale;

      const newImage: PlacedImage = {
        height: CANVAS_DIMENSIONS.DEFAULT_IMAGE_SIZE,
        id,
        isGenerated: true,
        rotation: 0,
        src: imageUrl,
        width: CANVAS_DIMENSIONS.DEFAULT_IMAGE_SIZE,
        x: viewportCenterX - CANVAS_DIMENSIONS.IMAGE_OFFSET,
        y: viewportCenterY - CANVAS_DIMENSIONS.IMAGE_OFFSET,
      };

      canvasState.setImages((prev) => [...prev, newImage]);
      canvasState.setSelectedIds([id]);
      toast({
        description: CANVAS_STRINGS.SUCCESS.IMAGE_GENERATED_DESCRIPTION,
        title: CANVAS_STRINGS.SUCCESS.IMAGE_GENERATED,
      });
    },
    [canvasState, toast]
  );

  // ========================================
  // Keyboard Shortcuts
  // ========================================

  useKeyboardShortcuts({
    bringForward: handleBringForward,
    canvasSize: canvasState.canvasSize,
    generationSettings: generationState.generationSettings,
    handleDelete,
    handleDuplicate,
    handleRun,
    images: canvasState.images,
    isGenerating: generationState.isGenerating,
    redo: handleRedo,
    selectedIds: canvasState.selectedIds,
    sendBackward: handleSendBackward,
    sendToBack: handleSendToBack,
    sendToFront: handleSendToFront,
    setSelectedIds: canvasState.setSelectedIds,
    setViewport: canvasState.setViewport,
    undo: handleUndo,
    viewport: canvasState.viewport,
  });

  // ========================================
  // Render
  // ========================================

  return (
    <div
      aria-label={ARIA_LABELS.CANVAS_MAIN}
      className="bg-background text-foreground font-focal relative flex flex-col w-full overflow-hidden h-screen"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => handleDrop(e, stageRef as React.RefObject<{ container(): HTMLElement }>)}
      role="application"
      style={{ height: "100dvh" }}
    >
      {/* Streaming Generation Components */}
      {Array.from(generationState.activeGenerations.entries()).map(
        ([imageId, generation]) => (
          <StreamingImage
            apiKey={uiState.customApiKey}
            generation={generation}
            imageId={imageId}
            key={imageId}
            onComplete={(id, finalUrl) => {
              // Check if this is a variation by looking at the ID pattern
              const isVariation = id.startsWith("variation-");
              
              // Extract timestamp from variation ID to find all variations in the same batch
              let variationBatchTimestamp: string | null = null;
              if (isVariation) {
                const match = id.match(/^variation-(\d+)-\d+$/);
                if (match) {
                  variationBatchTimestamp = match[1];
                }
              }

              canvasState.setImages((prev) =>
                prev.map((img) =>
                  img.id === id
                    ? { ...img, src: finalUrl, isLoading: false, opacity: 1.0 }
                    : img
                )
              );

              generationState.setActiveGenerations((prev) => {
                const newMap = new Map(prev);
                newMap.delete(id);

                // Check if this was the last variation in a batch to complete
                if (variationBatchTimestamp && newMap.size > 0) {
                  // Check if there are any more variations from the same batch still generating
                  const hasMoreFromBatch = Array.from(newMap.keys()).some(
                    (key) => key.startsWith(`variation-${variationBatchTimestamp}-`)
                  );
                  
                  // If no more variations from this batch, deselect the source image
                  if (!hasMoreFromBatch) {
                    canvasState.setSelectedIds([]);
                  }
                }

                // Only set isGenerating to false if this was the last active generation
                if (newMap.size === 0) {
                  generationState.setIsGenerating(false);
                  // Deselect all images when all generations are complete
                  if (isVariation) {
                    canvasState.setSelectedIds([]);
                  }
                }

                return newMap;
              });

              setTimeout(() => saveToStorage(), ANIMATION.SAVE_DELAY);
            }}
            onError={(id, error) => {
              console.error(`Generation error for ${id}:`, error);

              // Remove the failed image from canvas
              canvasState.setImages((prev) =>
                prev.filter((img) => img.id !== id)
              );

              // Remove from active generations
              generationState.setActiveGenerations((prev) => {
                const newMap = new Map(prev);
                newMap.delete(id);

                // Only set isGenerating to false if this was the last active generation
                if (newMap.size === 0) {
                  generationState.setIsGenerating(false);
                }

                return newMap;
              });

              // Show a less intrusive error for individual variations
              const isVariation = id.startsWith("variation-");
              toast({
                description: isVariation
                  ? "One variation failed to generate"
                  : error.toString(),
                title: isVariation
                  ? "Variation failed"
                  : CANVAS_STRINGS.ERRORS.GENERATION_FAILED,
                variant: "destructive",
              });
            }}
            onStreamingUpdate={(id, url) => {
              canvasState.setImages((prev) =>
                prev.map((img) => (img.id === id ? { ...img, src: url } : img))
              );
            }}
          />
        )
      )}

      {Array.from(generationState.activeVideoGenerations.entries()).map(
        ([id, generation]) => (
          <StreamingVideo
            apiKey={uiState.customApiKey}
            generation={generation}
            key={id}
            onComplete={handleVideoGenerationComplete}
            onError={handleVideoGenerationError}
            onProgress={handleVideoGenerationProgress}
            videoId={id}
          />
        )
      )}

      <main className="flex-1 relative flex items-center justify-center w-full">
        <div className="relative w-full h-full">
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <div
                aria-label={ARIA_LABELS.CONTEXT_MENU}
                className="relative bg-background overflow-hidden w-full h-full"
                style={{
                  WebkitTouchCallout: "none",
                  cursor: interactions.isPanningCanvas ? "grabbing" : "default",
                  height: `${canvasState.canvasSize.height}px`,
                  minHeight: `${canvasState.canvasSize.height}px`,
                  minWidth: `${canvasState.canvasSize.width}px`,
                  touchAction: "none",
                  width: `${canvasState.canvasSize.width}px`,
                }}
              >
                <CanvasStageRenderer
                  canvasSize={canvasState.canvasSize}
                  generationCount={uiState.generationCount}
                  generationSettings={generationState.generationSettings}
                  hiddenVideoControlsIds={uiState.hiddenVideoControlsIds}
                  images={canvasState.images}
                  interactions={interactions}
                  isCanvasReady={canvasState.isCanvasReady}
                  isGenerating={generationState.isGenerating}
                  onImageDoubleClick={handleImageDoubleClick}
                  saveToHistory={historyState.saveToHistory}
                  selectedIds={canvasState.selectedIds}
                  setHiddenVideoControlsIds={uiState.setHiddenVideoControlsIds}
                  setImages={canvasState.setImages}
                  setSelectedIds={canvasState.setSelectedIds}
                  setVideos={canvasState.setVideos}
                  showGrid={uiState.showGrid}
                  stageRef={stageRef}
                  videos={canvasState.videos}
                  viewport={canvasState.viewport}
                  variationMode={uiState.variationMode}
                />
              </div>
            </ContextMenuTrigger>
            <CanvasContextMenu
              bringForward={handleBringForward}
              generationSettings={generationState.generationSettings}
              handleCombineImages={handleCombineImages}
              handleConvertToVideo={handleConvertToVideo}
              handleDelete={handleDelete}
              handleDuplicate={handleDuplicate}
              handleExtendVideo={handleExtendVideo}
              handleRun={handleRun}
              handleVideoToVideo={handleVideoToVideo}
              images={canvasState.images}
              isGenerating={generationState.isGenerating}
              selectedIds={canvasState.selectedIds}
              sendBackward={handleSendBackward}
              sendToBack={handleSendToBack}
              sendToFront={handleSendToFront}
              videos={canvasState.videos}
            />
          </ContextMenu>

          {/* Minimap */}
          {uiState.showMinimap && (
            <MiniMap
              canvasSize={canvasState.canvasSize}
              images={canvasState.images}
              videos={canvasState.videos}
              viewport={canvasState.viewport}
            />
          )}

          {/* Zoom Controls */}
          <ZoomControls
            canvasSize={canvasState.canvasSize}
            setViewport={canvasState.setViewport}
            viewport={canvasState.viewport}
          />

          {/* Dimension Display */}
          <DimensionDisplay
            selectedImages={canvasState.images.filter((img) =>
              canvasState.selectedIds.includes(img.id)
            )}
            viewport={canvasState.viewport}
          />
        </div>
      </main>

      {/* Control Panel */}
      <CanvasControlPanel
        activeGenerationsSize={generationState.activeGenerations.size}
        activeVideoGenerationsSize={generationState.activeVideoGenerations.size}
        canRedo={historyState.canRedo}
        canUndo={historyState.canUndo}
        customApiKey={uiState.customApiKey}
        generationCount={uiState.generationCount}
        generationSettings={generationState.generationSettings}
        handleFileUpload={handleFileUpload}
        handleRun={handleRun}
        handleVariationModeChange={handleVariationModeChange}
        images={canvasState.images}
        isExtendingVideo={generationState.isExtendingVideo}
        isGenerating={generationState.isGenerating}
        isTransformingVideo={generationState.isTransformingVideo}
        redo={handleRedo}
        selectedIds={canvasState.selectedIds}
        setGenerationSettings={generationState.setGenerationSettings}
        setIsSettingsDialogOpen={uiState.setIsSettingsDialogOpen}
        showSuccess={generationState.showSuccess}
        toast={toast}
        undo={handleUndo}
        variationMode={uiState.variationMode}
      />

      {/* All Dialogs */}
      <CanvasDialogs
        customApiKey={uiState.customApiKey}
        handleImageToVideoConversion={handleImageToVideoConversion}
        handleVideoExtension={handleVideoExtension}
        handleVideoToVideoTransformation={handleVideoToVideoTransformation}
        images={canvasState.images}
        isConvertingToVideo={generationState.isConvertingToVideo}
        isExtendingVideo={generationState.isExtendingVideo}
        isExtendVideoDialogOpen={uiState.isExtendVideoDialogOpen}
        isImageToVideoDialogOpen={uiState.isImageToVideoDialogOpen}
        isSettingsDialogOpen={uiState.isSettingsDialogOpen}
        isTransformingVideo={generationState.isTransformingVideo}
        isVideoToVideoDialogOpen={uiState.isVideoToVideoDialogOpen}
        selectedImageForVideo={uiState.selectedImageForVideo}
        selectedVideoForExtend={uiState.selectedVideoForExtend}
        selectedVideoForVideo={uiState.selectedVideoForVideo}
        setCustomApiKey={uiState.setCustomApiKey}
        setIsExtendVideoDialogOpen={uiState.setIsExtendVideoDialogOpen}
        setIsImageToVideoDialogOpen={uiState.setIsImageToVideoDialogOpen}
        setIsSettingsDialogOpen={uiState.setIsSettingsDialogOpen}
        setIsVideoToVideoDialogOpen={uiState.setIsVideoToVideoDialogOpen}
        setSelectedImageForVideo={uiState.setSelectedImageForVideo}
        setSelectedVideoForExtend={uiState.setSelectedVideoForExtend}
        setSelectedVideoForVideo={uiState.setSelectedVideoForVideo}
        setShowGrid={uiState.setShowGrid}
        setShowMinimap={uiState.setShowMinimap}
        setTempApiKey={uiState.setTempApiKey}
        setTheme={setTheme}
        showGrid={uiState.showGrid}
        showMinimap={uiState.showMinimap}
        tempApiKey={uiState.tempApiKey}
        theme={theme}
        toast={toast}
        videos={canvasState.videos}
      />

      {/* Video Overlays */}
      <VideoOverlays
        hiddenVideoControlsIds={uiState.hiddenVideoControlsIds}
        selectedIds={canvasState.selectedIds}
        setVideos={canvasState.setVideos}
        videos={canvasState.videos}
        viewport={canvasState.viewport}
      />
    </div>
  );
}
