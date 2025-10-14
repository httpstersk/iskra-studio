"use client";

/**
 * Canvas Page - Main application page
 * Provides an infinite canvas for image and video manipulation with AI generation capabilities
 */

import { SignInPromptDialog } from "@/components/auth/sign-in-prompt-dialog";
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
import { CanvasHeader } from "@/components/layout/canvas-header";
import { ProjectPanel } from "@/components/projects/project-panel";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { ANIMATION, ARIA_LABELS, CANVAS_STRINGS } from "@/constants/canvas";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCanvasInteractions } from "@/hooks/useCanvasInteractions";
import { useCanvasState } from "@/hooks/useCanvasState-jotai";
import { useDefaultImages } from "@/hooks/useDefaultImages";
import { useFalClient } from "@/hooks/useFalClient";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useGenerationState } from "@/hooks/useGenerationState-jotai";
import { useHistoryState } from "@/hooks/useHistoryState-jotai";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useProjects } from "@/hooks/useProjects";
import { useStorage } from "@/hooks/useStorage";
import { useUIState } from "@/hooks/useUIState-jotai";
import { handleRun as handleRunHandler } from "@/lib/handlers/generation-handler";
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
import { handleVariationGeneration } from "@/lib/handlers/variation-handler";
import {
  dismissToast,
  handleVideoCompletion,
} from "@/lib/handlers/video-generation-handlers";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import Konva from "konva";
import { useTheme } from "next-themes";
import { useCallback, useRef, useState } from "react";

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

  // Authentication
  const { isAuthenticated, userId } = useAuth();
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  // Projects
  const projects = useProjects();

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
    canvasState.canvasSize,
    userId ?? undefined,
    toast
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
      if (
        canvasState.selectedIds.includes(imageId) &&
        uiState.variationMode === "image"
      ) {
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
  const handleVariationModeChange = useCallback(
    (mode: "image" | "video") => {
      uiState.setVariationMode(mode);
      // Reset count to 4 when switching to video mode
      if (mode === "video") {
        uiState.setGenerationCount(4);
      }
    },
    [uiState]
  );

  /**
   * Handles running image generation
   * If one image is selected with no prompt, generates variations based on mode and count
   * Otherwise, performs standard text-to-image or image-to-image generation
   */
  const handleRun = useCallback(async () => {
    // Block generation for non-authenticated users
    if (!isAuthenticated) {
      setShowSignInPrompt(true);
      return;
    }

    const isVariationMode =
      canvasState.selectedIds.length === 1 &&
      (uiState.variationMode === "image" || uiState.variationMode === "video");

    if (isVariationMode) {
      await handleVariationGeneration({
        falClient,
        userId: userId ?? undefined,
        images: canvasState.images,
        selectedIds: canvasState.selectedIds,
        setActiveGenerations: generationState.setActiveGenerations,
        setActiveVideoGenerations: generationState.setActiveVideoGenerations,
        setImages: canvasState.setImages,
        setIsGenerating: generationState.setIsGenerating,
        setVideos: canvasState.setVideos,
        toast,
        variationCount: uiState.generationCount,
        variationMode: uiState.variationMode,
        variationPrompt: generationState.generationSettings.variationPrompt,
        videoSettings: {
          aspectRatio: "auto",
          duration: generationState.videoDuration,
          modelId: generationState.useSoraPro ? "sora-2-pro" : "sora-2",
          prompt: generationState.generationSettings.variationPrompt || "",
          resolution: generationState.videoResolution,
        },
        viewport: canvasState.viewport,
      });
    } else {
      await handleRunHandler({
        canvasSize: canvasState.canvasSize,
        falClient,
        generateTextToImage,
        generationSettings: generationState.generationSettings,
        images: canvasState.images,
        selectedIds: canvasState.selectedIds,
        setActiveGenerations: generationState.setActiveGenerations,
        setImages: canvasState.setImages,
        setIsGenerating: generationState.setIsGenerating,
        setSelectedIds: canvasState.setSelectedIds,
        toast,
        viewport: canvasState.viewport,
      });
    }
  }, [
    isAuthenticated,
    canvasState.canvasSize,
    canvasState.images,
    canvasState.selectedIds,
    canvasState.setImages,
    canvasState.setSelectedIds,
    canvasState.setVideos,
    canvasState.viewport,
    falClient,
    generateTextToImage,
    generationState.generationSettings,
    generationState.setActiveGenerations,
    generationState.setActiveVideoGenerations,
    generationState.setIsGenerating,
    generationState.useSoraPro,
    generationState.videoDuration,
    generationState.videoResolution,
    toast,
    uiState.generationCount,
    uiState.variationMode,
  ]);

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
  const handleConvertToVideo = useCallback(
    (imageId: string) => {
      // Block video generation for non-authenticated users
      if (!isAuthenticated) {
        setShowSignInPrompt(true);
        return;
      }

      const image = canvasState.images.find((img) => img.id === imageId);
      if (!image) return;
      uiState.setIsImageToVideoDialogOpen(true);
      uiState.setSelectedImageForVideo(imageId);
    },
    [isAuthenticated, canvasState.images, uiState]
  );

  /**
   * Handles completion of video generation
   */
  const handleVideoGenerationComplete = useCallback(
    async (videoId: string, videoUrl: string, duration: number) => {
      try {
        const generation = generationState.activeVideoGenerations.get(videoId);

        if (generation?.toastId) {
          dismissToast(generation.toastId);
        }

        // Upload generated video to Convex storage for permanent storage
        let convexUrl = videoUrl;
        if (isAuthenticated) {
          try {
            const video = canvasState.videos.find((v) => v.id === videoId);
            
            const { uploadGeneratedAssetToConvex } = await import(
              "@/lib/storage/upload-generated-asset"
            );
            
            const uploadResult = await uploadGeneratedAssetToConvex({
              sourceUrl: videoUrl,
              assetType: "video",
              metadata: {
                prompt: generation?.prompt,
                width: video?.width,
                height: video?.height,
                duration,
                model: generation?.modelId,
              },
            });
            
            convexUrl = uploadResult.url;
            console.log(`[Video Generation] Uploaded to Convex:`, {
              videoId,
              storageId: uploadResult.storageId,
              assetId: uploadResult.assetId,
              isVariation: !!generation?.isVariation,
            });
          } catch (error) {
            console.error(`[Video Generation] Failed to upload to Convex:`, error);
            // Continue with original URL if Convex upload fails
          }
        }

        // Check if this is a variation - if so, update the placeholder
        if (generation?.isVariation) {

          canvasState.setVideos((prev) => {
            return prev.map((video) =>
              video.id === videoId
                ? {
                    ...video,
                    src: convexUrl,
                    duration,
                    isLoading: false,
                  }
                : video
            );
          });

          // Remove from active generations
          generationState.setActiveVideoGenerations((prev) => {
            const newMap = new Map(prev);
            newMap.delete(videoId);
            return newMap;
          });

          // Show success toast only after all variations complete
          if (generationState.activeVideoGenerations.size === 1) {
            // This is the last one
            historyState.saveToHistory();
            toast({
              title: "Video variations complete",
              description: "All 4 cinematic videos have been generated",
            });
          }

          generationState.setIsConvertingToVideo(false);
          return;
        }

        // Standard video generation (not variation)
        const { newVideo } = handleVideoCompletion(
          videoId,
          convexUrl,
          duration,
          generation || null,
          canvasState.images,
          uiState.selectedImageForVideo
        );

        if (newVideo) {
          canvasState.setVideos((prev) => [...prev, newVideo]);
          historyState.saveToHistory();
          toast({
            title: CANVAS_STRINGS.SUCCESS.VIDEO_CREATED,
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
    },
    [
      canvasState.images,
      canvasState.setVideos,
      canvasState.videos,
      generationState.activeVideoGenerations,
      generationState.setActiveVideoGenerations,
      generationState.setIsConvertingToVideo,
      historyState.saveToHistory,
      isAuthenticated,
      toast,
      uiState.selectedImageForVideo,
      uiState.setSelectedImageForVideo,
    ]
  );

  /**
   * Handles video generation error
   */
  const handleVideoGenerationError = useCallback(
    (videoId: string, error: string) => {
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
    },
    [generationState.setActiveVideoGenerations, toast]
  );

  /**
   * Handles video generation progress updates
   */
  const handleVideoGenerationProgress = useCallback(
    (videoId: string, progress: number, status: string) => {
      console.log(`Video generation progress: ${progress}% - ${status}`);
    },
    []
  );

  // ========================================
  // Streaming Generation Handlers
  // ========================================

  /**
   * Handles completion of streaming image generation
   */
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

      // Upload generated image to Convex storage for permanent storage
      let convexUrl = finalUrl;
      if (isAuthenticated) {
        try {
          const generation = generationState.activeGenerations.get(id);
          const image = canvasState.images.find((img) => img.id === id);
          
          const { uploadGeneratedAssetToConvex } = await import(
            "@/lib/storage/upload-generated-asset"
          );
          
          const uploadResult = await uploadGeneratedAssetToConvex({
            sourceUrl: finalUrl,
            assetType: "image",
            metadata: {
              prompt: generation?.prompt,
              width: image?.width,
              height: image?.height,
            },
          });
          
          convexUrl = uploadResult.url;
          console.log(`[Image Generation] Uploaded to Convex:`, {
            imageId: id,
            storageId: uploadResult.storageId,
            assetId: uploadResult.assetId,
            isVariation,
          });
        } catch (error) {
          console.error(`[Image Generation] Failed to upload to Convex:`, error);
          // Continue with fal-ai URL if Convex upload fails
        }
      }

      canvasState.setImages((prev) =>
        prev.map((img) =>
          img.id === id
            ? { ...img, isLoading: false, opacity: 1.0, src: convexUrl }
            : img
        )
      );

      generationState.setActiveGenerations((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);

        if (variationBatchTimestamp && newMap.size > 0) {
          const hasMoreFromBatch = Array.from(newMap.keys()).some((key) =>
            key.startsWith(`variation-${variationBatchTimestamp}-`)
          );

          if (!hasMoreFromBatch) {
            canvasState.setSelectedIds([]);
          }
        }

        if (newMap.size === 0) {
          generationState.setIsGenerating(false);
          if (isVariation) {
            canvasState.setSelectedIds([]);
          }
        }

        return newMap;
      });

      setTimeout(() => saveToStorage(), ANIMATION.SAVE_DELAY);
    },
    [
      canvasState.images,
      canvasState.setImages,
      canvasState.setSelectedIds,
      generationState.activeGenerations,
      generationState.setActiveGenerations,
      generationState.setIsGenerating,
      isAuthenticated,
      saveToStorage,
    ]
  );

  /**
   * Handles error during streaming image generation
   */
  const handleStreamingImageError = useCallback(
    (id: string, error: string) => {
      console.error(`Generation error for ${id}:`, error);

      canvasState.setImages((prev) => prev.filter((img) => img.id !== id));

      generationState.setActiveGenerations((prev) => {
        const newMap = new Map(prev);
        newMap.delete(id);

        if (newMap.size === 0) {
          generationState.setIsGenerating(false);
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
    [
      canvasState.setImages,
      generationState.setActiveGenerations,
      generationState.setIsGenerating,
      toast,
    ]
  );

  /**
   * Handles streaming update for image generation
   */
  const handleStreamingImageUpdate = useCallback(
    (id: string, url: string) => {
      canvasState.setImages((prev) =>
        prev.map((img) => (img.id === id ? { ...img, src: url } : img))
      );
    },
    [canvasState.setImages]
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
      onDrop={(e) =>
        handleDrop(e, stageRef as React.RefObject<{ container(): HTMLElement }>)
      }
      role="application"
      style={{ height: "100dvh" }}
    >
      {/* Header with authentication and storage */}
      <CanvasHeader />

      {/* Project panel for authenticated users */}
      {isAuthenticated && (
        <ProjectPanel
          onOpenProject={async (projectId) => {
            try {
              await projects.loadProject(projectId as any);
              toast({
                title: "Project loaded",
                description: "Your project has been loaded successfully.",
              });
            } catch (error) {
              console.error("Failed to load project:", error);
              toast({
                title: "Failed to load project",
                description:
                  error instanceof Error
                    ? error.message
                    : "An error occurred while loading the project.",
                variant: "destructive",
              });
            }
          }}
        />
      )}

      {/* Sign-in prompt dialog */}
      <SignInPromptDialog
        open={showSignInPrompt}
        onOpenChange={setShowSignInPrompt}
      />
      {/* Streaming Generation Components */}
      {Array.from(generationState.activeGenerations.entries()).map(
        ([imageId, generation]) => (
          <StreamingImage
            generation={generation}
            imageId={imageId}
            key={imageId}
            onComplete={handleStreamingImageComplete}
            onError={handleStreamingImageError}
            onStreamingUpdate={handleStreamingImageUpdate}
          />
        )
      )}

      {Array.from(generationState.activeVideoGenerations.entries()).map(
        ([id, generation]) => (
          <StreamingVideo
            generation={generation}
            key={id}
            onComplete={handleVideoGenerationComplete}
            onError={handleVideoGenerationError}
            onProgress={handleVideoGenerationProgress}
            videoId={id}
          />
        )
      )}

      <main className="flex-1 relative flex items-center justify-center w-full pt-14">
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
              handleRun={handleRun}
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
        generationCount={uiState.generationCount}
        generationSettings={generationState.generationSettings}
        handleFileUpload={handleFileUpload}
        handleRun={handleRun}
        handleVariationModeChange={handleVariationModeChange}
        images={canvasState.images}
        isGenerating={generationState.isGenerating}
        redo={handleRedo}
        selectedIds={canvasState.selectedIds}
        setGenerationSettings={generationState.setGenerationSettings}
        setIsSettingsDialogOpen={uiState.setIsSettingsDialogOpen}
        setUseSoraPro={generationState.setUseSoraPro}
        setVideoDuration={generationState.setVideoDuration}
        setVideoResolution={generationState.setVideoResolution}
        showSuccess={generationState.showSuccess}
        toast={toast}
        undo={handleUndo}
        useSoraPro={generationState.useSoraPro}
        variationMode={uiState.variationMode}
        videoDuration={generationState.videoDuration}
        videoResolution={generationState.videoResolution}
      />

      {/* All Dialogs */}
      <CanvasDialogs
        isImageToVideoDialogOpen={uiState.isImageToVideoDialogOpen}
        isSettingsDialogOpen={uiState.isSettingsDialogOpen}
        selectedImageForVideo={uiState.selectedImageForVideo}
        setIsImageToVideoDialogOpen={uiState.setIsImageToVideoDialogOpen}
        setIsSettingsDialogOpen={uiState.setIsSettingsDialogOpen}
        setSelectedImageForVideo={uiState.setSelectedImageForVideo}
        setShowGrid={uiState.setShowGrid}
        setShowMinimap={uiState.setShowMinimap}
        setTheme={setTheme}
        showGrid={uiState.showGrid}
        showMinimap={uiState.showMinimap}
        theme={theme}
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
