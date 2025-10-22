/**
 * Canvas Page Client Component - Extracted from page.tsx
 *
 * This is the actual canvas implementation, now separated to allow
 * server-side data pre-fetching in the parent page.tsx
 */

"use client";

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
import { ARIA_LABELS } from "@/constants/canvas";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCanvasHandlers } from "@/hooks/useCanvasHandlers";
import { useCanvasInteractions } from "@/hooks/useCanvasInteractions";
import { useCanvasState } from "@/hooks/useCanvasState-jotai";
import { useDefaultImages } from "@/hooks/useDefaultImages";
import { useFalClient } from "@/hooks/useFalClient";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useGenerationHandlers } from "@/hooks/useGenerationHandlers";
import { useGenerationState } from "@/hooks/useGenerationState-jotai";
import { useHistoryHandlers } from "@/hooks/useHistoryHandlers";
import { useHistoryState } from "@/hooks/useHistoryState-jotai";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useProjectSync } from "@/hooks/useProjectSync";
import { useProjects } from "@/hooks/useProjects";
import { useStorage } from "@/hooks/useStorage";
import { useStreamingHandlers } from "@/hooks/useStreamingHandlers";
import { useUIHandlers } from "@/hooks/useUIHandlers";
import { useUIState } from "@/hooks/useUIState-jotai";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import Konva from "konva";
import { useTheme } from "next-themes";
import { useRef, useState } from "react";

/**
 * Main Canvas Client Component
 *
 * Separated from page.tsx to enable server-side data pre-fetching.
 * This component receives pre-fetched data via context.
 */
export function CanvasPageClient() {
  const { setTheme, theme } = useTheme();
  const { toast } = useToast();
  const falClient = useFalClient();
  const stageRef = useRef<Konva.Stage>(null);
  const trpc = useTRPC();

  const canvasState = useCanvasState();
  const generationState = useGenerationState();
  const historyState = useHistoryState(
    canvasState.images,
    canvasState.videos,
    canvasState.selectedIds
  );
  const uiState = useUIState();

  const { isAuthenticated, userId } = useAuth();
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  const projects = useProjects();
  const { restoreLastGoodState } = useProjectSync();
  const [isProjectsPanelOpen, setIsProjectsPanelOpen] = useState(true);

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

  const { mutateAsync: generateTextToImage } = useMutation(
    trpc.generateTextToImage.mutationOptions()
  );

  useDefaultImages(
    isStorageLoaded,
    canvasState.images.length,
    canvasState.canvasSize,
    canvasState.setImages
  );

  const { handleRedo, handleUndo } = useHistoryHandlers({
    canRedo: historyState.canRedo,
    canUndo: historyState.canUndo,
    redo: historyState.redo,
    setImages: canvasState.setImages,
    setSelectedIds: canvasState.setSelectedIds,
    setVideos: canvasState.setVideos,
    undo: historyState.undo,
    updateHistoryIndex: historyState.setHistoryIndex,
  });

  const {
    handleBringForward,
    handleCombineImages,
    handleDelete,
    handleDuplicate,
    handleSendBackward,
    handleSendToBack,
    handleSendToFront,
  } = useCanvasHandlers({
    images: canvasState.images,
    saveToHistory: historyState.saveToHistory,
    selectedIds: canvasState.selectedIds,
    setImages: canvasState.setImages,
    setSelectedIds: canvasState.setSelectedIds,
    setVideos: canvasState.setVideos,
    toast,
    videos: canvasState.videos,
  });

  const { handleImageDoubleClick, handleVariationModeChange } = useUIHandlers({
    generationCount: uiState.generationCount,
    selectedIds: canvasState.selectedIds,
    setGenerationCount: uiState.setGenerationCount,
    setVariationMode: uiState.setVariationMode,
    variationMode: uiState.variationMode,
  });

  const { handleConvertToVideo, handleRun } = useGenerationHandlers({
    canvasSize: canvasState.canvasSize,
    falClient,
    generateTextToImage,
    generationCount: uiState.generationCount,
    generationSettings: generationState.generationSettings,
    imageModel: uiState.imageModel,
    imageVariationType: uiState.imageVariationType,
    images: canvasState.images,
    isAuthenticated,
    selectedIds: canvasState.selectedIds,
    setActiveGenerations: generationState.setActiveGenerations,
    setActiveVideoGenerations: generationState.setActiveVideoGenerations,
    setImages: canvasState.setImages,
    setIsGenerating: generationState.setIsGenerating,
    setIsImageToVideoDialogOpen: uiState.setIsImageToVideoDialogOpen,
    setSelectedIds: canvasState.setSelectedIds,
    setSelectedImageForVideo: uiState.setSelectedImageForVideo,
    setShowSignInPrompt,
    setVideos: canvasState.setVideos,
    toast,
    useSoraPro: generationState.useSoraPro,
    userId,
    variationMode: uiState.variationMode,
    videoDuration: generationState.videoDuration,
    videoResolution: generationState.videoResolution,
    viewport: canvasState.viewport,
  });

  const {
    handleStreamingImageComplete,
    handleStreamingImageError,
    handleStreamingImageUpdate,
    handleVideoGenerationComplete,
    handleVideoGenerationError,
    handleVideoGenerationProgress,
  } = useStreamingHandlers({
    activeGenerations: generationState.activeGenerations,
    activeVideoGenerations: generationState.activeVideoGenerations,
    images: canvasState.images,
    isAuthenticated,
    saveToHistory: historyState.saveToHistory,
    saveToStorage,
    selectedImageForVideo: uiState.selectedImageForVideo,
    setActiveGenerations: generationState.setActiveGenerations,
    setActiveVideoGenerations: generationState.setActiveVideoGenerations,
    setImages: canvasState.setImages,
    setIsConvertingToVideo: generationState.setIsConvertingToVideo,
    setIsGenerating: generationState.setIsGenerating,
    setSelectedIds: canvasState.setSelectedIds,
    setSelectedImageForVideo: uiState.setSelectedImageForVideo,
    setVideos: canvasState.setVideos,
    toast,
    videos: canvasState.videos,
  });

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

  return (
    <div
      aria-label={ARIA_LABELS.CANVAS_MAIN}
      className="bg-background text-foreground font-sans relative flex flex-col w-full overflow-hidden h-screen"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) =>
        handleDrop(e, stageRef as React.RefObject<{ container(): HTMLElement }>)
      }
      role="application"
      style={{ height: "100dvh" }}
    >
      <CanvasHeader />

      {isAuthenticated && (
        <ProjectPanel
          currentProjectId={projects.currentProject?._id}
          isOpen={isProjectsPanelOpen}
          onToggle={() => setIsProjectsPanelOpen(!isProjectsPanelOpen)}
          onOpenProject={async (projectId) => {
            try {
              await projects.loadProject(projectId as any);
            } catch (error) {
              // Restore last good state on error to prevent empty canvas
              restoreLastGoodState();

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

      <SignInPromptDialog
        open={showSignInPrompt}
        onOpenChange={setShowSignInPrompt}
      />

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

          {uiState.showMinimap && (
            <MiniMap
              canvasSize={canvasState.canvasSize}
              images={canvasState.images}
              videos={canvasState.videos}
              viewport={canvasState.viewport}
              setViewport={canvasState.setViewport}
            />
          )}

          <ZoomControls
            canvasSize={canvasState.canvasSize}
            isProjectsPanelOpen={
              isAuthenticated ? isProjectsPanelOpen : undefined
            }
            onToggleProjectsPanel={
              isAuthenticated
                ? () => setIsProjectsPanelOpen(!isProjectsPanelOpen)
                : undefined
            }
            setViewport={canvasState.setViewport}
            viewport={canvasState.viewport}
          />

          <DimensionDisplay
            selectedImages={canvasState.images.filter((img) =>
              canvasState.selectedIds.includes(img.id)
            )}
            viewport={canvasState.viewport}
          />
        </div>
      </main>

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
        imageModel={uiState.imageModel}
        imageVariationType={uiState.imageVariationType}
        images={canvasState.images}
        isGenerating={generationState.isGenerating}
        redo={handleRedo}
        selectedIds={canvasState.selectedIds}
        setGenerationSettings={generationState.setGenerationSettings}
        setImageModel={uiState.setImageModel}
        setImageVariationType={uiState.setImageVariationType}
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
