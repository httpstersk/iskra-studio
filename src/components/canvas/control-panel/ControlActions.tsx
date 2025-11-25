"use client";

import { Button } from "@/components/ui/button";
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
import { showError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type { GenerationSettings, PlacedImage } from "@/types/canvas";
import { checkOS } from "@/utils/os-utils";
import { ArrowUp, Paperclip } from "lucide-react";
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
  handleFileUpload: (files: FileList | null) => void,
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
    } catch (_error) {
      showError(
        CONTROL_PANEL_STRINGS.UPLOAD_FAILED,
        CONTROL_PANEL_STRINGS.UPLOAD_FAILED_DESC,
      );
    } finally {
      if (input.parentNode) {
        document.body.removeChild(input);
      }
    }
  };

  input.onerror = () => {
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
    } catch (_error) {
      showError(
        CONTROL_PANEL_STRINGS.UPLOAD_UNAVAILABLE,
        CONTROL_PANEL_STRINGS.UPLOAD_UNAVAILABLE_DESC,
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
        <DownloadAllButton images={images} selectedIds={selectedIds} />
      )}

      <TooltipProvider>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              className={cn(
                "group h-10 w-10 rounded-full transition-all overflow-hidden",
                isRunDisabled
                  ? "bg-neutral-200 dark:bg-neutral-700"
                  : "bg-white dark:bg-white shadow-[0_0_20px_rgba(255,255,255,0.6)] hover:bg-white dark:hover:bg-white hover:shadow-[0_0_25px_rgba(255,255,255,0.8)] dark:hover:shadow-[0_0_25px_rgba(255,255,255,0.7)]",
                isGenerating &&
                  "bg-neutral-300 dark:bg-neutral-600 shadow-none",
              )}
              disabled={isRunDisabled}
              onClick={handleRun}
              size="icon"
              variant="ghost"
            >
              <ArrowUp
                className={cn(
                  "h-5 w-5",
                  isRunDisabled
                    ? "text-neutral-400 dark:text-neutral-500"
                    : "text-neutral-900 group-hover:animate-arrow-cycle",
                )}
              />
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
