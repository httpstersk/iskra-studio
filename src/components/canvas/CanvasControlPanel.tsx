"use client";

import { ActionButtons } from "@/components/canvas/control-panel/ActionButtons";
import { ControlActions } from "@/components/canvas/control-panel/ControlActions";
import { GenerationsIndicatorWrapper } from "@/components/canvas/control-panel/GenerationsIndicatorWrapper";
import { ModeIndicator } from "@/components/canvas/control-panel/ModeIndicator";
import { PromptInput } from "@/components/canvas/control-panel/PromptInput";
import { VideoSettings } from "@/components/canvas/control-panel/VideoSettings";
import { CONTROL_PANEL_STYLES } from "@/constants/control-panel";
import { cn } from "@/lib/utils";
import type { GenerationSettings, PlacedImage } from "@/types/canvas";

/**
 * Props for the canvas control panel component.
 */
interface CanvasControlPanelProps {
  activeGenerationsSize: number;
  activeVideoGenerationsSize: number;
  canRedo: boolean;
  canUndo: boolean;
  generationCount: number;
  generationSettings: GenerationSettings;
  handleFileUpload: (files: FileList | null) => void;
  handleRun: () => void;
  handleVariationModeChange: (mode: "image" | "video") => void;
  images: PlacedImage[];
  isGenerating: boolean;
  redo: () => void;
  selectedIds: string[];
  setGenerationSettings: (settings: GenerationSettings) => void;
  setIsSettingsDialogOpen: (open: boolean) => void;
  setUseSoraPro: (value: boolean) => void;
  setVideoDuration: (value: "4" | "8" | "12") => void;
  setVideoResolution: (value: "auto" | "720p" | "1080p") => void;
  showSuccess: boolean;
  toast: (props: {
    description?: string;
    title: string;
    variant?: "default" | "destructive";
  }) => void;
  undo: () => void;
  useSoraPro: boolean;
  variationMode?: "image" | "video";
  videoDuration: "4" | "8" | "12";
  videoResolution: "auto" | "720p" | "1080p";
}

/**
 * Control panel that surfaces primary generation controls and status indicators.
 */
export function CanvasControlPanel({
  activeGenerationsSize,
  activeVideoGenerationsSize,
  canRedo,
  canUndo,
  generationCount,
  generationSettings,
  handleFileUpload,
  handleRun,
  handleVariationModeChange,
  images,
  isGenerating,
  redo,
  selectedIds,
  setGenerationSettings,
  setIsSettingsDialogOpen,
  setUseSoraPro,
  setVideoDuration,
  setVideoResolution,
  showSuccess,
  toast,
  undo,
  useSoraPro,
  variationMode = "image",
  videoDuration,
  videoResolution,
}: CanvasControlPanelProps) {
  const hasSelection = selectedIds.length > 0;
  return (
    <div className="fixed bottom-0 left-0 right-0 md:absolute md:bottom-4 md:left-1/2 md:transform md:-translate-x-1/2 z-20 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:p-0 md:pb-0 md:max-w-[648px]">
      <div
        className={cn(
          "bg-card/95 backdrop-blur-lg rounded-3xl",
          CONTROL_PANEL_STYLES.CARD_SHADOW,
          CONTROL_PANEL_STYLES.DARK_OUTLINE
        )}
      >
        <div className="flex flex-col gap-3 px-3 md:px-3 py-2 md:py-3 relative">
          {/* Active generations indicator */}
          <GenerationsIndicatorWrapper
            activeGenerationsSize={activeGenerationsSize}
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
                variationMode={variationMode}
              />

              {/* Video settings - only show when in video mode */}
              {hasSelection && variationMode === "video" && (
                <VideoSettings
                  setUseSoraPro={setUseSoraPro}
                  setVideoDuration={setVideoDuration}
                  useSoraPro={useSoraPro}
                  videoDuration={videoDuration}
                />
              )}
            </div>
            <div className="flex-1" />
            <ControlActions
              generationSettings={generationSettings}
              handleFileUpload={handleFileUpload}
              handleRun={handleRun}
              isGenerating={isGenerating}
              selectedIds={selectedIds}
              setIsSettingsDialogOpen={setIsSettingsDialogOpen}
              toast={toast}
            />
          </div>

          {/* Prompt input */}
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
  );
}
