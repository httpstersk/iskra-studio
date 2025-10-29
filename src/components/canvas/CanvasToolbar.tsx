"use client";

import { Logo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { showInfo } from "@/lib/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Viewport } from "@/hooks/useCanvasState";
import { canvasStorage } from "@/lib/storage";
import type { GenerationSettings, PlacedImage } from "@/types/canvas";
import { ImageIcon, Redo, SlidersHorizontal, Trash2, Undo } from "lucide-react";
import Link from "next/link";
import { MobileToolbar } from "./MobileToolbar";

interface CanvasToolbarProps {
  selectedIds: string[];
  images: PlacedImage[];
  canUndo: boolean;
  canRedo: boolean;
  isGenerating: boolean;
  generationSettings: GenerationSettings;
  undo: () => void;
  redo: () => void;
  handleRun: () => void;
  handleDuplicate: () => void;
  handleCombineImages: () => void;
  handleDelete: () => void;
  setIsSettingsDialogOpen: (open: boolean) => void;
  sendToFront: () => void;
  sendToBack: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  setImages: (images: PlacedImage[]) => void;
  setViewport: (viewport: Viewport) => void;
}

export function CanvasToolbar({
  selectedIds,
  images,
  canUndo,
  canRedo,
  isGenerating,
  generationSettings,
  undo,
  redo,
  handleRun,
  handleDuplicate,
  handleCombineImages,
  handleDelete,
  setIsSettingsDialogOpen,
  sendToFront,
  sendToBack,
  bringForward,
  sendBackward,
  setImages,
  setViewport,
}: CanvasToolbarProps) {
  return (
    <div className="absolute top-4 left-4 z-20 flex flex-col items-start gap-2">
      {/* Fal logo */}
      <div className="md:hidden border bg-background/80 py-2 px-3 flex flex-row rounded-xl gap-2 items-center">
        <Link
          href="https://fal.ai"
          target="_blank"
          className="block transition-opacity"
        >
          <Logo className="h-8 w-16 text-foreground" />
        </Link>
      </div>

      {/* Mobile tool icons */}
      <MobileToolbar
        selectedIds={selectedIds}
        images={images}
        isGenerating={isGenerating}
        generationSettings={generationSettings}
        handleRun={handleRun}
        handleDuplicate={handleDuplicate}
        handleCombineImages={handleCombineImages}
        handleDelete={handleDelete}
        sendToFront={sendToFront}
        sendToBack={sendToBack}
        bringForward={bringForward}
        sendBackward={sendBackward}
      />

      {/* Desktop toolbar (hidden on mobile) */}
      <div className="hidden md:flex items-center gap-3">
        <div className="rounded-xl overflow-clip flex items-center shadow-sm border border-border">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={undo}
            disabled={!canUndo}
            className="rounded-none"
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <div className="h-6 w-px bg-border" />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={redo}
            disabled={!canRedo}
            className="rounded-none"
            title="Redo"
          >
            <Redo className="h-4 w-4" strokeWidth={2} />
          </Button>
        </div>

        {/* Mode indicator badge */}
        <div
          className={`h-9 rounded-xl overflow-clip flex items-center px-3 pointer-events-none select-none ${
            selectedIds.length > 0
              ? "bg-blue-500/10 dark:bg-blue-500/15 border border-blue-500/30"
              : "bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/30"
          }`}
        >
          {selectedIds.length > 0 ? (
            <div className="flex items-center gap-2 text-xs font-medium">
              <ImageIcon className="w-4 h-4 text-blue-600 dark:text-blue-500" />
              <span className="text-blue-600 dark:text-blue-500">
                Image to Image
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs font-medium">
              <span className="text-orange-600 dark:text-orange-500 font-bold text-sm">
                T
              </span>
              <span className="text-orange-600 dark:text-orange-500">
                Text to Image
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Settings and Clear buttons (desktop) */}
      <div className="hidden md:flex items-center gap-2">
        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon-sm"
                onClick={async () => {
                  if (confirm("Clear all saved data? This cannot be undone.")) {
                    await canvasStorage.clearAll();
                    setImages([]);
                    setViewport({ x: 0, y: 0, scale: 1 });
                    showInfo(
                      "Storage cleared",
                      "All saved data has been removed"
                    );
                  }
                }}
                className="bg-destructive/10 text-destructive hover:bg-destructive/20"
                title="Clear storage"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-destructive">
              <span>Clear</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon-sm"
                className="relative"
                onClick={() => setIsSettingsDialogOpen(true)}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <span>Settings</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
