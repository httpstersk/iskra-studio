"use client";

import { Button } from "@/components/ui/button";
import { showError } from "@/lib/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CONTROL_PANEL_STRINGS,
  FILE_INPUT_CONFIG,
  getRunTooltipText,
} from "@/constants/control-panel";
import { cn } from "@/lib/utils";
import type { GenerationSettings, PlacedImage } from "@/types/canvas";
import { checkOS } from "@/utils/os-utils";
import { Paperclip, SparklesIcon } from "lucide-react";
import { ShortcutBadge } from "../ShortcutBadge";
import { DownloadAllButton } from "./DownloadAllButton";

/**
 * Props for the ControlActions component
 */
interface ControlActionsProps {
  generationSettings: GenerationSettings;
  handleFileUpload: (files: FileList | null) => void;
  handleRun: () => void;
  images: PlacedImage[];
  isGenerating: boolean;
  selectedIds: string[];
  setIsSettingsDialogOpen: (open: boolean) => void;
}

/**
 * Creates and configures a file input element for image upload
 */
const createFileInput = (
  handleFileUpload: (files: FileList | null) => void
): HTMLInputElement => {
  const input = document.createElement("input");
  input.type = FILE_INPUT_CONFIG.TYPE;
  input.accept = FILE_INPUT_CONFIG.ACCEPT;
  input.multiple = FILE_INPUT_CONFIG.MULTIPLE;
  input.style.position = "fixed";
  input.style.top = "-1000px";
  input.style.left = "-1000px";
  input.style.opacity = "0";
  input.style.pointerEvents = "none";
  input.style.width = "1px";
  input.style.height = "1px";

  input.onchange = (e) => {
    try {
      handleFileUpload((e.target as HTMLInputElement).files);
    } catch (error) {
      console.error("File upload error:", error);
      showError(
        CONTROL_PANEL_STRINGS.UPLOAD_FAILED,
        CONTROL_PANEL_STRINGS.UPLOAD_FAILED_DESC
      );
    } finally {
      if (input.parentNode) {
        document.body.removeChild(input);
      }
    }
  };

  input.onerror = () => {
    console.error("File input error");
    if (input.parentNode) {
      document.body.removeChild(input);
    }
  };

  return input;
};

/**
 * Triggers the file input dialog
 */
const triggerFileDialog = (input: HTMLInputElement) => {
  document.body.appendChild(input);

  // Use requestAnimationFrame to ensure DOM operations are synchronized with browser's render cycle
  requestAnimationFrame(() => {
    try {
      input.click();
    } catch (error) {
      console.error("Failed to trigger file dialog:", error);
      showError(
        CONTROL_PANEL_STRINGS.UPLOAD_UNAVAILABLE,
        CONTROL_PANEL_STRINGS.UPLOAD_UNAVAILABLE_DESC
      );

      if (input.parentNode) {
        document.body.removeChild(input);
      }
    }
  });

  // Cleanup after 2 frames to ensure file dialog has been triggered
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (input.parentNode) {
        document.body.removeChild(input);
      }
    });
  });
};

/**
 * Control actions component (Settings, Upload, Download All, Run buttons)
 */
export function ControlActions({
  generationSettings,
  handleFileUpload,
  handleRun,
  images,
  isGenerating,
  selectedIds,
}: ControlActionsProps) {
  const handleUploadClick = () => {
    const input = createFileInput(handleFileUpload);
    triggerFileDialog(input);
  };

  const hasSelection = selectedIds.length > 0;
  const hasPrompt = generationSettings.prompt.trim().length > 0;
  const isRunDisabled = !hasSelection && !hasPrompt;
  const runTooltipText = getRunTooltipText(selectedIds.length === 1, hasPrompt);
  const shortcut =
    checkOS("Win") || checkOS("Linux") ? "ctrl+enter" : "meta+enter";

  // Check if selected items are images (not videos)
  const selectedImages = images.filter((img) => selectedIds.includes(img.id));
  const hasSelectedImages = selectedImages.length > 0;

  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              className="border-none"
              onClick={handleUploadClick}
              size="icon"
              title={CONTROL_PANEL_STRINGS.UPLOAD}
              variant="ghost"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <span>{CONTROL_PANEL_STRINGS.UPLOAD}</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {hasSelectedImages && (
        <DownloadAllButton
          images={images}
          selectedIds={selectedIds}
        />
      )}

      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              className={cn(
                "gap-2 font-medium transition-all",
                isGenerating && "bg-secondary"
              )}
              disabled={isRunDisabled}
              onClick={handleRun}
              size="icon"
              variant="primary"
            >
              <SparklesIcon className="h-4 w-4 text-white fill-white" />
            </Button>
          </TooltipTrigger>

          <TooltipContent>
            <div className="flex items-center gap-2">
              <span>{runTooltipText}</span>
              <ShortcutBadge shortcut={shortcut} size="xs" variant="default" />
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
