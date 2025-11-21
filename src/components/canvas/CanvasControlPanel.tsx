"use client";

import { ActionButtons } from "@/components/canvas/control-panel/ActionButtons";
import { ControlActions } from "@/components/canvas/control-panel/ControlActions";
import { GenerationsIndicatorWrapper } from "@/components/canvas/control-panel/GenerationsIndicatorWrapper";
import { ImageSettings } from "@/components/canvas/control-panel/ImageSettings";
import { ModeIndicator } from "@/components/canvas/control-panel/ModeIndicator";
import { PromptInput } from "@/components/canvas/control-panel/PromptInput";
import { VideoSettings } from "@/components/canvas/control-panel/VideoSettings";
import type { ImageModelId } from "@/lib/image-models";
import { cn } from "@/lib/utils";
import type { GenerationSettings, PlacedImage } from "@/types/canvas";
import React from "react";

/**
 * Props for the canvas control panel component.
 */
interface CanvasControlPanelProps {
  activeGenerations: Map<string, import("@/types/canvas").ActiveGeneration>;
  activeGenerationsSize: number;
  activeVideoGenerations: Map<
    string,
    import("@/types/canvas").ActiveVideoGeneration
  >;
  activeVideoGenerationsSize: number;
  canRedo: boolean;
  canUndo: boolean;
  generationCount: number;
  generationSettings: GenerationSettings;
  handleFileUpload: (files: FileList | null) => void;
  handleRun: () => void;
  handleVariationModeChange: (mode: "image" | "video") => void;
  imageModel: ImageModelId;
  imageVariationType?: "camera-angles" | "director" | "lighting";
  images: PlacedImage[];
  isGenerating: boolean;
  redo: () => void;
  selectedIds: string[];
  setGenerationSettings: (settings: GenerationSettings) => void;
  setImageModel: (value: ImageModelId) => void;
  setImageVariationType?: (
    type: "camera-angles" | "director" | "lighting"
  ) => void;
  setIsSettingsDialogOpen: (open: boolean) => void;
  setVideoDuration: (value: "4" | "8" | "12") => void;
  setVideoModel: (
    value: "sora-2" | "sora-2-pro" | "veo-3.1" | "veo-3.1-pro"
  ) => void;
  setVideoResolution: (value: "auto" | "720p" | "1080p") => void;
  showSuccess: boolean;
  undo: () => void;
  variationMode?: "image" | "video";
  videoDuration: "4" | "8" | "12";
  videoModel: "sora-2" | "sora-2-pro" | "veo-3.1" | "veo-3.1-pro";
  videoResolution: "auto" | "720p" | "1080p";
}

/**
 * Control panel that surfaces primary generation controls and status indicators.
 * Memoized to prevent unnecessary rerenders when parent state changes.
 */
export const CanvasControlPanel = React.memo(function CanvasControlPanel({
  activeGenerations,
  activeGenerationsSize,
  activeVideoGenerations,
  activeVideoGenerationsSize,
  canRedo,
  canUndo,
  generationSettings,
  handleFileUpload,
  handleRun,
  handleVariationModeChange,
  imageModel,
  imageVariationType = "camera-angles",
  images,
  isGenerating,
  redo,
  selectedIds,
  setGenerationSettings,
  setImageModel,
  setImageVariationType,
  setIsSettingsDialogOpen,
  setVideoDuration,
  setVideoModel,
  setVideoResolution: _setVideoResolution,
  showSuccess,
  undo,
  variationMode = "image",
  videoDuration,
  videoModel,
  videoResolution: _videoResolution,
}: CanvasControlPanelProps) {
  const hasSelection = selectedIds.length > 0;
  return (
    <div className="fixed bottom-0 left-0 right-0 md:absolute md:bottom-4 md:left-1/2 md:transform md:-translate-x-1/2 z-20 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:p-0 md:pb-0 flex justify-center">
      <div
        className={cn(
          "bg-card/98 backdrop-blur-2xl rounded-2xl border border-border/50",
          "shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
          "w-full md:w-fit"
        )}
      >
        <div className="flex flex-col gap-3 px-4 md:px-4 py-3 md:py-3 relative justify-between min-w-0">
          {/* Active generations indicator */}
          <GenerationsIndicatorWrapper
            activeGenerations={activeGenerations}
            activeGenerationsSize={activeGenerationsSize}
            activeVideoGenerations={activeVideoGenerations}
            activeVideoGenerationsSize={activeVideoGenerationsSize}
            isGenerating={isGenerating}
            showSuccess={showSuccess}
          />

          {/* Action buttons row */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-3">
              <ActionButtons
                canRedo={canRedo}
                canUndo={canUndo}
                redo={redo}
                undo={undo}
              />

              {/* Mode indicator badge with switch */}
              <ModeIndicator
                handleVariationModeChange={handleVariationModeChange}
                hasSelection={hasSelection}
                imageVariationType={imageVariationType}
                setImageVariationType={setImageVariationType}
                variationMode={variationMode}
              />

              {/* Image settings - only show when in image mode */}
              {hasSelection && variationMode === "image" && (
                <ImageSettings
                  imageModel={imageModel}
                  setImageModel={setImageModel}
                />
              )}

              {/* Video settings - only show when in video mode */}
              {hasSelection && variationMode === "video" && (
                <VideoSettings
                  setVideoDuration={setVideoDuration}
                  setVideoModel={setVideoModel}
                  videoDuration={videoDuration}
                  videoModel={videoModel}
                />
              )}
            </div>

            <div className="flex-1 min-w-0" />

            <ControlActions
              generationSettings={generationSettings}
              handleFileUpload={handleFileUpload}
              handleRun={handleRun}
              images={images}
              isGenerating={isGenerating}
              selectedIds={selectedIds}
              setIsSettingsDialogOpen={setIsSettingsDialogOpen}
            />
          </div>

          {/* Prompt input */}
          <div className="flex items-center gap-1">
            <PromptInput
              generationSettings={generationSettings}
              handleRun={handleRun}
              images={images}
              isGenerating={isGenerating}
              selectedIds={selectedIds}
              setGenerationSettings={setGenerationSettings}
            />
          </div>
        </div>
      </div>
    </div>
  );
});
