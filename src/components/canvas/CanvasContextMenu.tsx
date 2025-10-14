/**
 * Canvas context menu component - provides right-click actions for selected elements
 *
 * @module components/canvas/CanvasContextMenu
 */

import { SpinnerIcon } from "@/components/icons";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import type {
  GenerationSettings,
  PlacedImage,
  PlacedVideo,
} from "@/types/canvas";
import { checkOS } from "@/utils/os-utils";
import {
  ChevronDown,
  ChevronUp,
  Combine,
  Copy,
  Download,
  Layers,
  MoveDown,
  MoveUp,
  Play,
  Video,
  X,
} from "lucide-react";
import React, { useCallback } from "react";
import { ShortcutBadge } from "./ShortcutBadge";

/**
 * Props for the canvas context menu component
 */
interface CanvasContextMenuProps {
  bringForward: () => void;
  generationSettings: GenerationSettings;
  handleCombineImages: () => void;
  handleConvertToVideo?: (imageId: string) => void;
  handleDelete: () => void;
  handleDuplicate: () => void;
  handleRun: () => void;
  images: PlacedImage[];
  isGenerating: boolean;
  selectedIds: string[];
  sendBackward: () => void;
  sendToBack: () => void;
  sendToFront: () => void;
  videos?: PlacedVideo[];
}

/**
 * Context menu displayed within the canvas, providing quick actions for selected elements
 */
export const CanvasContextMenu = React.memo<CanvasContextMenuProps>(
  function CanvasContextMenu({
    bringForward,
    generationSettings,
    handleCombineImages,
    handleConvertToVideo,
    handleDelete,
    handleDuplicate,
    handleRun,
    images,
    isGenerating,
    selectedIds,
    sendBackward,
    sendToBack,
    sendToFront,
    videos = [],
  }) {
    /**
     * Handles downloading selected images and videos
     */
    const handleDownload = useCallback(async () => {
      for (const id of selectedIds) {
        const image = images.find((img) => img.id === id);
        const video = videos?.find((vid) => vid.id === id);

        if (image) {
          const link = document.createElement("a");
          link.download = `image-${Date.now()}.png`;
          link.href = image.src;
          link.click();
        } else if (video) {
          try {
            const response = await fetch(video.src);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.download = `video-${Date.now()}.mp4`;
            link.href = blobUrl;
            link.click();

            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
          } catch (error) {
            console.error("Failed to download video:", error);
            const link = document.createElement("a");
            link.download = `video-${Date.now()}.mp4`;
            link.href = video.src;
            link.target = "_blank";
            link.click();
          }
        }
      }
    }, [images, selectedIds, videos]);

    return (
      <ContextMenuContent>
        <ContextMenuItem
          onClick={handleRun}
          disabled={isGenerating || !generationSettings.prompt.trim()}
          className="flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            {isGenerating ? (
              <SpinnerIcon className="h-4 w-4 animate-spin text-content" />
            ) : (
              <Play className="h-4 w-4 text-content" />
            )}
            <span>Run</span>
          </div>
          <ShortcutBadge
            variant="alpha"
            size="xs"
            shortcut={
              checkOS("Win") || checkOS("Linux") ? "ctrl+enter" : "meta+enter"
            }
          />
        </ContextMenuItem>

        <ContextMenuItem
          onClick={handleDuplicate}
          disabled={selectedIds.length === 0}
          className="flex items-center gap-2"
        >
          <Copy className="h-4 w-4" />
          Duplicate
        </ContextMenuItem>

        {selectedIds.length === 1 &&
          handleConvertToVideo &&
          images.some((img) => img.id === selectedIds[0]) && (
            <ContextMenuItem
              onClick={() => {
                handleConvertToVideo(selectedIds[0]);
              }}
              className="flex items-center gap-2"
            >
              <Video className="h-4 w-4" />
              Image to Video
            </ContextMenuItem>
          )}

        <ContextMenuItem
          onClick={handleCombineImages}
          disabled={selectedIds.length < 2}
          className="flex items-center gap-2"
        >
          <Combine className="h-4 w-4" />
          Combine Images
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger
            disabled={
              selectedIds.length === 0 ||
              videos?.some((v) => selectedIds.includes(v.id))
            }
            className="flex items-center gap-2"
          >
            <Layers className="h-4 w-4" />
            Layer Order
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-64" sideOffset={10}>
            <ContextMenuItem
              onClick={sendToFront}
              disabled={selectedIds.length === 0}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <MoveUp className="h-4 w-4" />
                <span>Send to Front</span>
              </div>
              <ShortcutBadge
                variant="alpha"
                size="xs"
                shortcut={
                  checkOS("Win") || checkOS("Linux") ? "ctrl+]" : "meta+]"
                }
              />
            </ContextMenuItem>
            <ContextMenuItem
              onClick={bringForward}
              disabled={selectedIds.length === 0}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <ChevronUp className="h-4 w-4" />
                <span>Bring Forward</span>
              </div>
              <ShortcutBadge variant="alpha" size="xs" shortcut="]" />
            </ContextMenuItem>
            <ContextMenuItem
              onClick={sendBackward}
              disabled={selectedIds.length === 0}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <ChevronDown className="h-4 w-4" />
                <span>Send Backward</span>
              </div>
              <ShortcutBadge variant="alpha" size="xs" shortcut="[" />
            </ContextMenuItem>
            <ContextMenuItem
              onClick={sendToBack}
              disabled={selectedIds.length === 0}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <MoveDown className="h-4 w-4" />
                <span>Send to Back</span>
              </div>
              <ShortcutBadge
                variant="alpha"
                size="xs"
                shortcut={
                  checkOS("Win") || checkOS("Linux") ? "ctrl+[" : "meta+["
                }
              />
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuItem
          className="flex items-center gap-2"
          disabled={selectedIds.length === 0}
          onClick={handleDownload}
        >
          <Download className="h-4 w-4" />
          Download
        </ContextMenuItem>

        <ContextMenuItem
          onClick={handleDelete}
          disabled={selectedIds.length === 0}
          className="flex items-center gap-2 text-destructive"
        >
          <X className="h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    );
  }
);
