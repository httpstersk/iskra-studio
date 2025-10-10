"use client";

import React, { useRef, useCallback, useEffect } from "react";
import { Stage, Layer } from "react-konva";
import Konva from "konva";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X } from "lucide-react";

// Hooks
import { useCanvasState } from "@/hooks/useCanvasState";
import { useGenerationState } from "@/hooks/useGenerationState";
import { useHistoryState } from "@/hooks/useHistoryState";
import { useUIState } from "@/hooks/useUIState";
import { useCanvasInteractions } from "@/hooks/useCanvasInteractions";
import { useStorage } from "@/hooks/useStorage";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useFalClient } from "@/hooks/useFalClient";
import { useToast } from "@/hooks/use-toast";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";

// Components
import { Button } from "@/components/ui/button";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { StreamingImage } from "@/components/canvas/StreamingImage";
import { StreamingVideo } from "@/components/canvas/StreamingVideo";
import { CanvasImage } from "@/components/canvas/CanvasImage";
import { CanvasVideo } from "@/components/canvas/CanvasVideo";
import { CanvasGrid } from "@/components/canvas/CanvasGrid";
import { SelectionBoxComponent } from "@/components/canvas/SelectionBox";
import { MiniMap } from "@/components/canvas/MiniMap";
import { ZoomControls } from "@/components/canvas/ZoomControls";
import { PoweredByFalBadge } from "@/components/canvas/PoweredByFalBadge";
import { GithubBadge } from "@/components/canvas/GithubBadge";
import { VideoOverlays } from "@/components/canvas/VideoOverlays";
import { DimensionDisplay } from "@/components/canvas/DimensionDisplay";
import { CanvasContextMenu } from "@/components/canvas/CanvasContextMenu";
import { CropOverlayWrapper } from "@/components/canvas/CropOverlayWrapper";
import { CanvasControlPanel } from "@/components/canvas/CanvasControlPanel";
import { CanvasDialogs } from "@/components/canvas/CanvasDialogs";
import Chat from "@/components/chat/chat";

// Handlers
import { handleRun as handleRunHandler } from "@/lib/handlers/generation-handler";
import { handleRemoveBackground as handleRemoveBackgroundHandler } from "@/lib/handlers/background-handler";
import {
  sendToFront as sendToFrontHandler,
  sendToBack as sendToBackHandler,
  bringForward as bringForwardHandler,
  sendBackward as sendBackwardHandler,
} from "@/lib/handlers/layer-handlers";
import {
  combineImages,
  duplicateElements,
  deleteElements,
  createCroppedImage,
} from "@/lib/handlers/image-handlers";

// Types & Utils
import type { VideoGenerationSettings, PlacedImage, PlacedVideo } from "@/types/canvas";
import { convertImageToVideo } from "@/utils/video-utils";
import { cn } from "@/lib/utils";
import { getVideoModelById } from "@/lib/video-models";

export default function CanvasPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const trpc = useTRPC();
  const stageRef = useRef<Konva.Stage>(null);

  // ========================================
  // State Management via Custom Hooks
  // ========================================
  
  const {
    images,
    setImages,
    videos,
    setVideos,
    selectedIds,
    setSelectedIds,
    viewport,
    setViewport,
    canvasSize,
    isCanvasReady,
  } = useCanvasState();

  const {
    generationSettings,
    setGenerationSettings,
    previousStyleId,
    setPreviousStyleId,
    isGenerating,
    setIsGenerating,
    activeGenerations,
    setActiveGenerations,
    activeVideoGenerations,
    setActiveVideoGenerations,
    isConvertingToVideo,
    setIsConvertingToVideo,
    isTransformingVideo,
    setIsTransformingVideo,
    isExtendingVideo,
    setIsExtendingVideo,
    isRemovingVideoBackground,
    setIsRemovingVideoBackground,
    isIsolating,
    setIsIsolating,
    showSuccess,
  } = useGenerationState();

  const {
    history,
    historyIndex,
    setHistoryIndex,
    saveToHistory,
    undo: undoHistory,
    redo: redoHistory,
    canUndo,
    canRedo,
  } = useHistoryState(images, videos, selectedIds);

  const {
    isSettingsDialogOpen,
    setIsSettingsDialogOpen,
    isStyleDialogOpen,
    setIsStyleDialogOpen,
    isApiKeyDialogOpen,
    setIsApiKeyDialogOpen,
    isImageToVideoDialogOpen,
    setIsImageToVideoDialogOpen,
    isVideoToVideoDialogOpen,
    setIsVideoToVideoDialogOpen,
    isExtendVideoDialogOpen,
    setIsExtendVideoDialogOpen,
    isRemoveVideoBackgroundDialogOpen,
    setIsRemoveVideoBackgroundDialogOpen,
    selectedImageForVideo,
    setSelectedImageForVideo,
    selectedVideoForVideo,
    setSelectedVideoForVideo,
    selectedVideoForExtend,
    setSelectedVideoForExtend,
    selectedVideoForBackgroundRemoval,
    setSelectedVideoForBackgroundRemoval,
    croppingImageId,
    setCroppingImageId,
    isolateTarget,
    setIsolateTarget,
    isolateInputValue,
    setIsolateInputValue,
    showGrid,
    setShowGrid,
    showMinimap,
    setShowMinimap,
    showChat,
    setShowChat,
    customApiKey,
    setCustomApiKey,
    tempApiKey,
    setTempApiKey,
    hiddenVideoControlsIds,
    setHiddenVideoControlsIds,
  } = useUIState();

  // ========================================
  // Interaction Hooks
  // ========================================

  const interactions = useCanvasInteractions(
    viewport,
    setViewport,
    canvasSize,
    images,
    videos,
    selectedIds,
    setSelectedIds,
    croppingImageId
  );

  const { isStorageLoaded, saveToStorage } = useStorage(
    images,
    videos,
    viewport,
    setImages,
    setVideos,
    setViewport,
    activeGenerations.size
  );

  const { handleFileUpload, handleDrop } = useFileUpload(
    setImages,
    viewport,
    canvasSize
  );

  const falClient = useFalClient(customApiKey);

  const { mutateAsync: removeBackground } = useMutation(
    trpc.removeBackground.mutationOptions()
  );
  const { mutateAsync: isolateObject } = useMutation(
    trpc.isolateObject.mutationOptions()
  );
  const { mutateAsync: generateTextToImage } = useMutation(
    trpc.generateTextToImage.mutationOptions()
  );

  // ========================================
  // Action Handlers
  // ========================================

  const undo = useCallback(() => {
    const result = undoHistory();
    if (result) {
      setImages(result.images);
      setVideos(result.videos);
      setSelectedIds(result.selectedIds);
      setHistoryIndex(result.newIndex);
    }
  }, [undoHistory, setImages, setVideos, setSelectedIds, setHistoryIndex]);

  const redo = useCallback(() => {
    const result = redoHistory();
    if (result) {
      setImages(result.images);
      setVideos(result.videos);
      setSelectedIds(result.selectedIds);
      setHistoryIndex(result.newIndex);
    }
  }, [redoHistory, setImages, setVideos, setSelectedIds, setHistoryIndex]);

  const handleRun = async () => {
    await handleRunHandler({
      images,
      selectedIds,
      generationSettings,
      customApiKey,
      canvasSize,
      viewport,
      falClient,
      setImages,
      setSelectedIds,
      setActiveGenerations,
      setIsGenerating,
      setIsApiKeyDialogOpen,
      toast,
      generateTextToImage,
    });
  };

  const handleDelete = useCallback(() => {
    saveToHistory();
    const { newImages, newVideos } = deleteElements(images, videos, selectedIds);
    setImages(newImages);
    setVideos(newVideos);
    setSelectedIds([]);
  }, [images, videos, selectedIds, saveToHistory, setImages, setVideos, setSelectedIds]);

  const handleDuplicate = useCallback(() => {
    saveToHistory();
    const { newImages, newVideos } = duplicateElements(images, videos, selectedIds);
    setImages((prev) => [...prev, ...newImages]);
    setVideos((prev) => [...prev, ...newVideos]);
    setSelectedIds([...newImages.map((img) => img.id), ...newVideos.map((vid) => vid.id)]);
  }, [images, videos, selectedIds, saveToHistory, setImages, setVideos, setSelectedIds]);

  const handleRemoveBackground = async () => {
    await handleRemoveBackgroundHandler({
      images,
      selectedIds,
      setImages,
      toast,
      saveToHistory,
      removeBackground,
      customApiKey,
      falClient,
      setIsApiKeyDialogOpen,
    });
  };

  const handleCombineImages = useCallback(async () => {
    if (selectedIds.length < 2) return;
    saveToHistory();
    
    try {
      const combinedImage = await combineImages(images, selectedIds);
      setImages((prev) => [
        ...prev.filter((img) => !selectedIds.includes(img.id)),
        combinedImage,
      ]);
      setSelectedIds([combinedImage.id]);
    } catch (error) {
      console.error("Failed to combine images:", error);
      toast({
        title: "Failed to combine images",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [images, selectedIds, saveToHistory, setImages, setSelectedIds, toast]);

  const sendToFront = useCallback(() => {
    if (selectedIds.length === 0) return;
    saveToHistory();
    setImages(sendToFrontHandler(images, selectedIds));
  }, [images, selectedIds, saveToHistory, setImages]);

  const sendToBack = useCallback(() => {
    if (selectedIds.length === 0) return;
    saveToHistory();
    setImages(sendToBackHandler(images, selectedIds));
  }, [images, selectedIds, saveToHistory, setImages]);

  const bringForward = useCallback(() => {
    if (selectedIds.length === 0) return;
    saveToHistory();
    setImages(bringForwardHandler(images, selectedIds));
  }, [images, selectedIds, saveToHistory, setImages]);

  const sendBackward = useCallback(() => {
    if (selectedIds.length === 0) return;
    saveToHistory();
    setImages(sendBackwardHandler(images, selectedIds));
  }, [images, selectedIds, saveToHistory, setImages]);

  // ========================================
  // Video Generation Handlers
  // ========================================

  const handleConvertToVideo = (imageId: string) => {
    const image = images.find((img) => img.id === imageId);
    if (!image) return;
    setSelectedImageForVideo(imageId);
    setIsImageToVideoDialogOpen(true);
  };

  const handleImageToVideoConversion = async (settings: VideoGenerationSettings) => {
    if (!selectedImageForVideo) return;
    const image = images.find((img) => img.id === selectedImageForVideo);
    if (!image) return;

    try {
      setIsConvertingToVideo(true);

      let imageUrl = image.src;
      if (imageUrl.startsWith("data:")) {
        const uploadResult = await falClient.storage.upload(
          await (await fetch(imageUrl)).blob()
        );
        imageUrl = uploadResult;
      }

      const generationId = `img2vid_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      setActiveVideoGenerations((prev) => {
        const newMap = new Map(prev);
        newMap.set(generationId, {
          imageUrl,
          prompt: settings.prompt || "",
          duration: settings.duration || 5,
          modelId: settings.modelId,
          resolution: settings.resolution || "720p",
          cameraFixed: settings.cameraFixed,
          seed: settings.seed,
          sourceImageId: selectedImageForVideo,
        });
        return newMap;
      });

      setIsConvertingToVideo(false);
      setIsImageToVideoDialogOpen(false);
    } catch (error) {
      console.error("Error starting image-to-video conversion:", error);
      toast({
        title: "Conversion failed",
        description: error instanceof Error ? error.message : "Failed to start conversion",
        variant: "destructive",
      });
      setIsConvertingToVideo(false);
    }
  };

  const handleVideoToVideo = (videoId: string) => {
    setSelectedVideoForVideo(videoId);
    setIsVideoToVideoDialogOpen(true);
  };

  const handleVideoToVideoTransformation = async (settings: VideoGenerationSettings) => {
    if (!selectedVideoForVideo) return;
    const video = videos.find((vid) => vid.id === selectedVideoForVideo);
    if (!video) return;

    try {
      setIsTransformingVideo(true);

      let videoUrl = video.src;
      if (videoUrl.startsWith("data:") || videoUrl.startsWith("blob:")) {
        const uploadResult = await falClient.storage.upload(
          await (await fetch(videoUrl)).blob()
        );
        videoUrl = uploadResult;
      }

      const generationId = `vid2vid_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      setActiveVideoGenerations((prev) => {
        const newMap = new Map(prev);
        newMap.set(generationId, {
          ...settings,
          imageUrl: videoUrl,
          duration: video.duration || settings.duration || 5,
          modelId: settings.modelId || "seedance-pro",
          resolution: settings.resolution || "720p",
          isVideoToVideo: true,
          sourceVideoId: selectedVideoForVideo,
        });
        return newMap;
      });

      setIsVideoToVideoDialogOpen(false);
    } catch (error) {
      console.error("Error starting video-to-video transformation:", error);
      toast({
        title: "Transformation failed",
        description: error instanceof Error ? error.message : "Failed to start transformation",
        variant: "destructive",
      });
      setIsTransformingVideo(false);
    }
  };

  const handleExtendVideo = (videoId: string) => {
    setSelectedVideoForExtend(videoId);
    setIsExtendVideoDialogOpen(true);
  };

  const handleVideoExtension = async (settings: VideoGenerationSettings) => {
    if (!selectedVideoForExtend) return;
    const video = videos.find((vid) => vid.id === selectedVideoForExtend);
    if (!video) return;

    try {
      setIsExtendingVideo(true);

      let videoUrl = video.src;
      if (videoUrl.startsWith("data:") || videoUrl.startsWith("blob:")) {
        const uploadResult = await falClient.storage.upload(
          await (await fetch(videoUrl)).blob()
        );
        videoUrl = uploadResult;
      }

      const generationId = `vid_ext_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      setActiveVideoGenerations((prev) => {
        const newMap = new Map(prev);
        newMap.set(generationId, {
          ...settings,
          imageUrl: videoUrl,
          duration: video.duration || settings.duration || 5,
          modelId: settings.modelId || "seedance-pro",
          resolution: settings.resolution || "720p",
          isVideoToVideo: true,
          isVideoExtension: true,
          sourceVideoId: selectedVideoForExtend,
        });
        return newMap;
      });

      setIsExtendVideoDialogOpen(false);
    } catch (error) {
      console.error("Error starting video extension:", error);
      toast({
        title: "Extension failed",
        description: error instanceof Error ? error.message : "Failed to start video extension",
        variant: "destructive",
      });
      setIsExtendingVideo(false);
    }
  };

  const handleRemoveVideoBackground = (videoId: string) => {
    setSelectedVideoForBackgroundRemoval(videoId);
    setIsRemoveVideoBackgroundDialogOpen(true);
  };

  const handleVideoBackgroundRemoval = async (backgroundColor: string) => {
    if (!selectedVideoForBackgroundRemoval) return;
    const video = videos.find((vid) => vid.id === selectedVideoForBackgroundRemoval);
    if (!video) return;

    try {
      setIsRemovingVideoBackground(true);
      setIsRemoveVideoBackgroundDialogOpen(false);

      let videoUrl = video.src;
      if (videoUrl.startsWith("data:") || videoUrl.startsWith("blob:")) {
        const uploadResult = await falClient.storage.upload(
          await (await fetch(videoUrl)).blob()
        );
        videoUrl = uploadResult;
      }

      const generationId = `bg_removal_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      const colorMap: Record<string, string> = {
        transparent: "Transparent",
        black: "Black",
        white: "White",
        gray: "Gray",
        red: "Red",
        green: "Green",
        blue: "Blue",
        yellow: "Yellow",
        cyan: "Cyan",
        magenta: "Magenta",
        orange: "Orange",
      };

      setActiveVideoGenerations((prev) => {
        const newMap = new Map(prev);
        newMap.set(generationId, {
          imageUrl: videoUrl,
          prompt: "Removing background from video",
          duration: video.duration || 5,
          modelId: "bria-video-background-removal",
          modelConfig: getVideoModelById("bria-video-background-removal"),
          sourceVideoId: video.id,
          backgroundColor: colorMap[backgroundColor] || "Black",
        });
        return newMap;
      });

      const toastId = toast({
        title: "Removing background from video",
        description: "This may take several minutes...",
        duration: Infinity,
      }).id;

      setActiveVideoGenerations((prev) => {
        const newMap = new Map(prev);
        const generation = newMap.get(generationId);
        if (generation) {
          newMap.set(generationId, { ...generation, toastId });
        }
        return newMap;
      });
    } catch (error) {
      console.error("Error removing video background:", error);
      toast({
        title: "Error processing video",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
      setIsRemovingVideoBackground(false);
    } finally {
      setSelectedVideoForBackgroundRemoval(null);
    }
  };

  const handleVideoGenerationComplete = async (
    videoId: string,
    videoUrl: string,
    duration: number
  ) => {
    try {
      const generation = activeVideoGenerations.get(videoId);
      const sourceImageId = generation?.sourceImageId || selectedImageForVideo;

      if (generation?.toastId) {
        const toastElement = document.querySelector(`[data-toast-id="${generation.toastId}"]`);
        if (toastElement) {
          const closeButton = toastElement.querySelector("[data-radix-toast-close]");
          if (closeButton instanceof HTMLElement) {
            closeButton.click();
          }
        }
      }

      if (sourceImageId) {
        const image = images.find((img) => img.id === sourceImageId);
        if (image) {
          const video = convertImageToVideo(image, videoUrl, duration, false);
          video.x = image.x + image.width + 20;
          video.y = image.y;
          setVideos((prev) => [...prev, { ...video, isVideo: true as const }]);
          saveToHistory();
          toast({ title: "Video created successfully" });
        }
      } else if (generation?.sourceVideoId) {
        const sourceVideo = videos.find((vid) => vid.id === generation.sourceVideoId);
        if (sourceVideo) {
          const newVideo: PlacedVideo = {
            id: `video_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            src: videoUrl,
            x: sourceVideo.x + sourceVideo.width + 20,
            y: sourceVideo.y,
            width: sourceVideo.width,
            height: sourceVideo.height,
            rotation: 0,
            isPlaying: false,
            currentTime: 0,
            duration,
            volume: 1,
            muted: false,
            isLooping: false,
            isVideo: true as const,
          };
          setVideos((prev) => [...prev, newVideo]);
          saveToHistory();
          toast({ title: "Video processed successfully" });
        }
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
        title: "Error creating video",
        description: error instanceof Error ? error.message : "Failed to create video",
        variant: "destructive",
      });
    }
  };

  const handleVideoGenerationError = (videoId: string, error: string) => {
    console.error("Video generation error:", error);
    toast({
      title: "Video generation failed",
      description: error,
      variant: "destructive",
    });
    setActiveVideoGenerations((prev) => {
      const newMap = new Map(prev);
      newMap.delete(videoId);
      return newMap;
    });
  };

  const handleVideoGenerationProgress = (videoId: string, progress: number, status: string) => {
    console.log(`Video generation progress: ${progress}% - ${status}`);
  };

  const handleChatImageGenerated = useCallback(
    (imageUrl: string) => {
      const id = `chat-generated-${Date.now()}-${Math.random()}`;
      const viewportCenterX = (canvasSize.width / 2 - viewport.x) / viewport.scale;
      const viewportCenterY = (canvasSize.height / 2 - viewport.y) / viewport.scale;

      const newImage: PlacedImage = {
        id,
        src: imageUrl,
        x: viewportCenterX - 256,
        y: viewportCenterY - 256,
        width: 512,
        height: 512,
        rotation: 0,
        isGenerated: true,
      };

      setImages((prev) => [...prev, newImage]);
      setSelectedIds([id]);
      toast({ title: "Image generated", description: "The AI-generated image has been added to the canvas" });
    },
    [canvasSize, viewport, toast, setImages, setSelectedIds]
  );

  // ========================================
  // Keyboard Shortcuts
  // ========================================

  useKeyboardShortcuts({
    images,
    selectedIds,
    setSelectedIds,
    croppingImageId,
    setCroppingImageId,
    generationSettings,
    isGenerating,
    viewport,
    setViewport,
    canvasSize,
    undo,
    redo,
    handleDelete,
    handleDuplicate,
    handleRun,
    sendToFront,
    sendToBack,
    bringForward,
    sendBackward,
  });

  // ========================================
  // Body Scroll Prevention
  // ========================================

  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    document.body.style.height = "100%";

    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.height = "";
    };
  }, []);

  // ========================================
  // Load Default Images
  // ========================================

  useEffect(() => {
    if (!isStorageLoaded || images.length > 0) return;

    const loadDefaultImages = async () => {
      const defaultImagePaths = ["/chad.png", "/anime.png"];

      for (let i = 0; i < defaultImagePaths.length; i++) {
        const path = defaultImagePaths[i];
        try {
          const response = await fetch(path);
          const blob = await response.blob();
          const reader = new FileReader();

          reader.onload = (e) => {
            const img = new window.Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              const id = `default-${path.replace("/", "").replace(".png", "")}-${Date.now()}`;
              const aspectRatio = img.width / img.height;
              const maxSize = 200;
              let width = maxSize;
              let height = maxSize / aspectRatio;

              if (height > maxSize) {
                height = maxSize;
                width = maxSize * aspectRatio;
              }

              const spacing = 250;
              const totalWidth = spacing * (defaultImagePaths.length - 1);
              const viewportCenterX = canvasSize.width / 2;
              const viewportCenterY = canvasSize.height / 2;
              const startX = viewportCenterX - totalWidth / 2;
              const x = startX + i * spacing - width / 2;
              const y = viewportCenterY - height / 2;

              setImages((prev) => [
                ...prev,
                { id, src: e.target?.result as string, x, y, width, height, rotation: 0 },
              ]);
            };
            img.src = e.target?.result as string;
          };

          reader.readAsDataURL(blob);
        } catch (error) {
          console.error(`Failed to load default image ${path}:`, error);
        }
      }
    };

    loadDefaultImages();
  }, [isStorageLoaded, images.length, canvasSize, setImages]);

  // ========================================
  // Render
  // ========================================

  return (
    <div
      className="bg-background text-foreground font-focal relative flex flex-col w-full overflow-hidden h-screen"
      style={{ height: "100dvh" }}
      onDrop={(e) => handleDrop(e, stageRef)}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Streaming Generation Components */}
      {Array.from(activeGenerations.entries()).map(([imageId, generation]) => (
        <StreamingImage
          key={imageId}
          imageId={imageId}
          generation={generation}
          apiKey={customApiKey}
          onStreamingUpdate={(id, url) => {
            setImages((prev) =>
              prev.map((img) => (img.id === id ? { ...img, src: url } : img))
            );
          }}
          onComplete={(id, finalUrl) => {
            setImages((prev) =>
              prev.map((img) => (img.id === id ? { ...img, src: finalUrl } : img))
            );
            setActiveGenerations((prev) => {
              const newMap = new Map(prev);
              newMap.delete(id);
              return newMap;
            });
            setIsGenerating(false);
            setTimeout(() => saveToStorage(), 100);
          }}
          onError={(id, error) => {
            console.error(`Generation error for ${id}:`, error);
            setImages((prev) => prev.filter((img) => img.id !== id));
            setActiveGenerations((prev) => {
              const newMap = new Map(prev);
              newMap.delete(id);
              return newMap;
            });
            setIsGenerating(false);
            toast({
              title: "Generation failed",
              description: error.toString(),
              variant: "destructive",
            });
          }}
        />
      ))}

      {Array.from(activeVideoGenerations.entries()).map(([id, generation]) => (
        <StreamingVideo
          key={id}
          videoId={id}
          generation={generation}
          onComplete={handleVideoGenerationComplete}
          onError={handleVideoGenerationError}
          onProgress={handleVideoGenerationProgress}
          apiKey={customApiKey}
        />
      ))}

      {/* Main Canvas */}
      <main className="flex-1 relative flex items-center justify-center w-full">
        <div className="relative w-full h-full">
          {/* Gradient Overlays */}
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-background to-transparent z-10" />
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent z-10" />
          <div className="pointer-events-none absolute top-0 bottom-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="pointer-events-none absolute top-0 bottom-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />

          <ContextMenu onOpenChange={(open) => {
            if (!open) {
              setIsolateTarget(null);
              setIsolateInputValue("");
            }
          }}>
            <ContextMenuTrigger asChild>
              <div
                className="relative bg-background overflow-hidden w-full h-full"
                style={{
                  height: `${canvasSize.height}px`,
                  width: `${canvasSize.width}px`,
                  minHeight: `${canvasSize.height}px`,
                  minWidth: `${canvasSize.width}px`,
                  cursor: interactions.isPanningCanvas ? "grabbing" : "default",
                  WebkitTouchCallout: "none",
                  touchAction: "none",
                }}
              >
                {isCanvasReady && (
                  <Stage
                    ref={stageRef}
                    width={canvasSize.width}
                    height={canvasSize.height}
                    x={viewport.x}
                    y={viewport.y}
                    scaleX={viewport.scale}
                    scaleY={viewport.scale}
                    draggable={false}
                    onMouseDown={(e) => interactions.handleMouseDown(e, setCroppingImageId)}
                    onMouseMove={interactions.handleMouseMove}
                    onMouseUp={interactions.handleMouseUp}
                    onMouseLeave={() => {
                      if (interactions.isPanningCanvas) {
                        // Stop panning
                      }
                    }}
                    onTouchStart={interactions.handleTouchStart}
                    onTouchMove={interactions.handleTouchMove}
                    onTouchEnd={interactions.handleTouchEnd}
                    onContextMenu={(e) => {
                      // Handle right-click context menu
                      const stage = e.target.getStage();
                      if (!stage) return;
                      const point = stage.getPointerPosition();
                      if (!point) return;
                      const canvasPoint = {
                        x: (point.x - viewport.x) / viewport.scale,
                        y: (point.y - viewport.y) / viewport.scale,
                      };
                      const clickedVideo = [...videos].reverse().find((vid) => {
                        return (
                          canvasPoint.x >= vid.x &&
                          canvasPoint.x <= vid.x + vid.width &&
                          canvasPoint.y >= vid.y &&
                          canvasPoint.y <= vid.y + vid.height
                        );
                      });
                      if (clickedVideo && !selectedIds.includes(clickedVideo.id)) {
                        setSelectedIds([clickedVideo.id]);
                        return;
                      }
                      const clickedImage = [...images].reverse().find((img) => {
                        return (
                          canvasPoint.x >= img.x &&
                          canvasPoint.x <= img.x + img.width &&
                          canvasPoint.y >= img.y &&
                          canvasPoint.y <= img.y + img.height
                        );
                      });
                      if (clickedImage && !selectedIds.includes(clickedImage.id)) {
                        setSelectedIds([clickedImage.id]);
                      }
                    }}
                    onWheel={interactions.handleWheel}
                  >
                    <Layer>
                      {showGrid && <CanvasGrid viewport={viewport} canvasSize={canvasSize} />}
                      <SelectionBoxComponent selectionBox={interactions.selectionBox} />

                      {/* Render Images */}
                      {images.filter((image) => {
                        const buffer = 100;
                        const viewBounds = {
                          left: -viewport.x / viewport.scale - buffer,
                          top: -viewport.y / viewport.scale - buffer,
                          right: (canvasSize.width - viewport.x) / viewport.scale + buffer,
                          bottom: (canvasSize.height - viewport.y) / viewport.scale + buffer,
                        };
                        return !(
                          image.x + image.width < viewBounds.left ||
                          image.x > viewBounds.right ||
                          image.y + image.height < viewBounds.top ||
                          image.y > viewBounds.bottom
                        );
                      }).map((image) => (
                        <CanvasImage
                          key={image.id}
                          image={image}
                          isSelected={selectedIds.includes(image.id)}
                          onSelect={(e) => interactions.handleSelect(image.id, e)}
                          onChange={(newAttrs) => {
                            setImages((prev) =>
                              prev.map((img) =>
                                img.id === image.id ? { ...img, ...newAttrs } : img
                              )
                            );
                          }}
                          onDoubleClick={() => setCroppingImageId(image.id)}
                          onDragStart={() => {
                            let currentSelectedIds = selectedIds;
                            if (!selectedIds.includes(image.id)) {
                              currentSelectedIds = [image.id];
                              setSelectedIds(currentSelectedIds);
                            }
                            interactions.setIsDraggingImage(true);
                            const positions = new Map<string, { x: number; y: number }>();
                            currentSelectedIds.forEach((id) => {
                              const img = images.find((i) => i.id === id);
                              if (img) positions.set(id, { x: img.x, y: img.y });
                            });
                            interactions.setDragStartPositions(positions);
                          }}
                          onDragEnd={() => {
                            interactions.setIsDraggingImage(false);
                            saveToHistory();
                            interactions.setDragStartPositions(new Map());
                          }}
                          selectedIds={selectedIds}
                          setImages={setImages}
                          isDraggingImage={interactions.isDraggingImage}
                          isCroppingImage={croppingImageId === image.id}
                          dragStartPositions={interactions.dragStartPositions}
                        />
                      ))}

                      {/* Render Videos */}
                      {videos.filter((video) => {
                        const buffer = 100;
                        const viewBounds = {
                          left: -viewport.x / viewport.scale - buffer,
                          top: -viewport.y / viewport.scale - buffer,
                          right: (canvasSize.width - viewport.x) / viewport.scale + buffer,
                          bottom: (canvasSize.height - viewport.y) / viewport.scale + buffer,
                        };
                        return !(
                          video.x + video.width < viewBounds.left ||
                          video.x > viewBounds.right ||
                          video.y + video.height < viewBounds.top ||
                          video.y > viewBounds.bottom
                        );
                      }).map((video) => (
                        <CanvasVideo
                          key={video.id}
                          video={video}
                          isSelected={selectedIds.includes(video.id)}
                          onSelect={(e) => interactions.handleSelect(video.id, e)}
                          onChange={(newAttrs) => {
                            setVideos((prev) =>
                              prev.map((vid) =>
                                vid.id === video.id ? { ...vid, ...newAttrs } : vid
                              )
                            );
                          }}
                          onDragStart={() => {
                            let currentSelectedIds = selectedIds;
                            if (!selectedIds.includes(video.id)) {
                              currentSelectedIds = [video.id];
                              setSelectedIds(currentSelectedIds);
                            }
                            interactions.setIsDraggingImage(true);
                            setHiddenVideoControlsIds((prev) => new Set([...prev, video.id]));
                            const positions = new Map<string, { x: number; y: number }>();
                            currentSelectedIds.forEach((id) => {
                              const vid = videos.find((v) => v.id === id);
                              if (vid) positions.set(id, { x: vid.x, y: vid.y });
                            });
                            interactions.setDragStartPositions(positions);
                          }}
                          onDragEnd={() => {
                            interactions.setIsDraggingImage(false);
                            setHiddenVideoControlsIds((prev) => {
                              const newSet = new Set(prev);
                              newSet.delete(video.id);
                              return newSet;
                            });
                            saveToHistory();
                            interactions.setDragStartPositions(new Map());
                          }}
                          selectedIds={selectedIds}
                          videos={videos}
                          setVideos={setVideos}
                          isDraggingVideo={interactions.isDraggingImage}
                          isCroppingVideo={false}
                          dragStartPositions={interactions.dragStartPositions}
                          onResizeStart={() =>
                            setHiddenVideoControlsIds((prev) => new Set([...prev, video.id]))
                          }
                          onResizeEnd={() =>
                            setHiddenVideoControlsIds((prev) => {
                              const newSet = new Set(prev);
                              newSet.delete(video.id);
                              return newSet;
                            })
                          }
                        />
                      ))}

                      {/* Crop Overlay */}
                      {croppingImageId && (() => {
                        const croppingImage = images.find((img) => img.id === croppingImageId);
                        if (!croppingImage) return null;
                        return (
                          <CropOverlayWrapper
                            image={croppingImage}
                            viewportScale={viewport.scale}
                            onCropChange={(crop) => {
                              setImages((prev) =>
                                prev.map((img) =>
                                  img.id === croppingImageId ? { ...img, ...crop } : img
                                )
                              );
                            }}
                            onCropEnd={async () => {
                              if (croppingImage) {
                                const cropWidth = croppingImage.cropWidth || 1;
                                const cropHeight = croppingImage.cropHeight || 1;
                                const cropX = croppingImage.cropX || 0;
                                const cropY = croppingImage.cropY || 0;

                                try {
                                  const croppedImageSrc = await createCroppedImage(
                                    croppingImage.src,
                                    cropX,
                                    cropY,
                                    cropWidth,
                                    cropHeight
                                  );

                                  setImages((prev) =>
                                    prev.map((img) =>
                                      img.id === croppingImageId
                                        ? {
                                            ...img,
                                            src: croppedImageSrc,
                                            x: img.x + cropX * img.width,
                                            y: img.y + cropY * img.height,
                                            width: cropWidth * img.width,
                                            height: cropHeight * img.height,
                                            cropX: undefined,
                                            cropY: undefined,
                                            cropWidth: undefined,
                                            cropHeight: undefined,
                                          }
                                        : img
                                    )
                                  );
                                } catch (error) {
                                  console.error("Failed to create cropped image:", error);
                                }
                              }
                              setCroppingImageId(null);
                              saveToHistory();
                            }}
                          />
                        );
                      })()}
                    </Layer>
                  </Stage>
                )}
              </div>
            </ContextMenuTrigger>
            <CanvasContextMenu
              selectedIds={selectedIds}
              images={images}
              videos={videos}
              isGenerating={isGenerating}
              generationSettings={generationSettings}
              isolateInputValue={isolateInputValue}
              isIsolating={isIsolating}
              handleRun={handleRun}
              handleDuplicate={handleDuplicate}
              handleRemoveBackground={handleRemoveBackground}
              handleCombineImages={handleCombineImages}
              handleDelete={handleDelete}
              handleIsolate={async () => {
                // TODO: Implement isolate handler
              }}
              handleConvertToVideo={handleConvertToVideo}
              handleVideoToVideo={handleVideoToVideo}
              handleExtendVideo={handleExtendVideo}
              handleRemoveVideoBackground={handleRemoveVideoBackground}
              setCroppingImageId={setCroppingImageId}
              setIsolateInputValue={setIsolateInputValue}
              setIsolateTarget={setIsolateTarget}
              sendToFront={sendToFront}
              sendToBack={sendToBack}
              bringForward={bringForward}
              sendBackward={sendBackward}
            />
          </ContextMenu>

          {/* Minimap */}
          {showMinimap && (
            <MiniMap images={images} videos={videos} viewport={viewport} canvasSize={canvasSize} />
          )}

          {/* Zoom Controls */}
          <ZoomControls viewport={viewport} setViewport={setViewport} canvasSize={canvasSize} />

          <PoweredByFalBadge />
          <GithubBadge />

          {/* Dimension Display */}
          <DimensionDisplay
            selectedImages={images.filter((img) => selectedIds.includes(img.id))}
            viewport={viewport}
          />
        </div>
      </main>

      {/* Control Panel */}
      <CanvasControlPanel
        selectedIds={selectedIds}
        images={images}
        generationSettings={generationSettings}
        setGenerationSettings={setGenerationSettings}
        previousStyleId={previousStyleId}
        isGenerating={isGenerating}
        handleRun={handleRun}
        handleFileUpload={handleFileUpload}
        setIsStyleDialogOpen={setIsStyleDialogOpen}
        activeGenerationsSize={activeGenerations.size}
        activeVideoGenerationsSize={activeVideoGenerations.size}
        isRemovingVideoBackground={isRemovingVideoBackground}
        isIsolating={isIsolating}
        isExtendingVideo={isExtendingVideo}
        isTransformingVideo={isTransformingVideo}
        showSuccess={showSuccess}
        canUndo={canUndo}
        canRedo={canRedo}
        undo={undo}
        redo={redo}
        setIsSettingsDialogOpen={setIsSettingsDialogOpen}
        customApiKey={customApiKey}
        toast={toast}
      />

      {/* All Dialogs */}
      <CanvasDialogs
        isSettingsDialogOpen={isSettingsDialogOpen}
        setIsSettingsDialogOpen={setIsSettingsDialogOpen}
        customApiKey={customApiKey}
        setCustomApiKey={setCustomApiKey}
        tempApiKey={tempApiKey}
        setTempApiKey={setTempApiKey}
        theme={theme}
        setTheme={setTheme}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        showMinimap={showMinimap}
        setShowMinimap={setShowMinimap}
        toast={toast}
        isStyleDialogOpen={isStyleDialogOpen}
        setIsStyleDialogOpen={setIsStyleDialogOpen}
        generationSettings={generationSettings}
        setGenerationSettings={setGenerationSettings}
        isImageToVideoDialogOpen={isImageToVideoDialogOpen}
        setIsImageToVideoDialogOpen={setIsImageToVideoDialogOpen}
        selectedImageForVideo={selectedImageForVideo}
        setSelectedImageForVideo={setSelectedImageForVideo}
        handleImageToVideoConversion={handleImageToVideoConversion}
        images={images}
        isConvertingToVideo={isConvertingToVideo}
        isVideoToVideoDialogOpen={isVideoToVideoDialogOpen}
        setIsVideoToVideoDialogOpen={setIsVideoToVideoDialogOpen}
        selectedVideoForVideo={selectedVideoForVideo}
        setSelectedVideoForVideo={setSelectedVideoForVideo}
        handleVideoToVideoTransformation={handleVideoToVideoTransformation}
        videos={videos}
        isTransformingVideo={isTransformingVideo}
        isExtendVideoDialogOpen={isExtendVideoDialogOpen}
        setIsExtendVideoDialogOpen={setIsExtendVideoDialogOpen}
        selectedVideoForExtend={selectedVideoForExtend}
        setSelectedVideoForExtend={setSelectedVideoForExtend}
        handleVideoExtension={handleVideoExtension}
        isExtendingVideo={isExtendingVideo}
        isRemoveVideoBackgroundDialogOpen={isRemoveVideoBackgroundDialogOpen}
        setIsRemoveVideoBackgroundDialogOpen={setIsRemoveVideoBackgroundDialogOpen}
        selectedVideoForBackgroundRemoval={selectedVideoForBackgroundRemoval}
        setSelectedVideoForBackgroundRemoval={setSelectedVideoForBackgroundRemoval}
        handleVideoBackgroundRemoval={handleVideoBackgroundRemoval}
        isRemovingVideoBackground={isRemovingVideoBackground}
      />

      {/* Video Overlays */}
      <VideoOverlays
        videos={videos}
        selectedIds={selectedIds}
        viewport={viewport}
        hiddenVideoControlsIds={hiddenVideoControlsIds}
        setVideos={setVideos}
      />

      {/* Chat UI */}
      <div className="fixed right-4 top-4 bottom-4 z-50">
        <AnimatePresence>
          {!showChat && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute bottom-0 right-0"
            >
              <Button
                onClick={() => setShowChat(true)}
                className="shadow-lg rounded-full h-14 w-14 md:w-auto md:h-auto md:rounded-lg"
                variant="primary"
                size="lg"
              >
                <MessageCircle className="h-5 w-5 md:mr-2" />
                <span className="hidden md:inline">Chat</span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-card border rounded-2xl shadow-2xl w-[95vw] md:w-[500px] lg:w-[500px] h-full overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b flex items-center justify-between shrink-0 bg-muted/30">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <MessageCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">AI Assistant</h3>
                    <p className="text-xs text-muted-foreground">Powered by GPT-4</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowChat(false)}
                  className="hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden bg-background">
                <Chat onImageGenerated={handleChatImageGenerated} customApiKey={customApiKey} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
