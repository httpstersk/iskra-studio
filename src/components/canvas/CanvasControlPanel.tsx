"use client";

import { GenerationsIndicator } from "@/components/generations-indicator";
import { SpinnerIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { GenerationSettings, PlacedImage } from "@/types/canvas";
import { checkOS } from "@/utils/os-utils";
import { AnimatePresence, motion } from "framer-motion";
import {
  ImagesIcon,
  Paperclip,
  PlayIcon,
  Redo,
  SlidersHorizontal,
  Undo,
} from "lucide-react";
import { ShortcutBadge } from "./ShortcutBadge";

interface CanvasControlPanelProps {
  selectedIds: string[];
  images: PlacedImage[];
  generationSettings: GenerationSettings;
  setGenerationSettings: (settings: GenerationSettings) => void;
  isGenerating: boolean;
  handleRun: () => void;
  handleFileUpload: (files: FileList | null) => void;
  activeGenerationsSize: number;
  activeVideoGenerationsSize: number;
  isExtendingVideo: boolean;
  isTransformingVideo: boolean;
  showSuccess: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  setIsSettingsDialogOpen: (open: boolean) => void;
  customApiKey: string;
  toast: any;
}

export function CanvasControlPanel({
  selectedIds,
  images,
  generationSettings,
  setGenerationSettings,
  isGenerating,
  handleRun,
  handleFileUpload,
  activeGenerationsSize,
  activeVideoGenerationsSize,
  isExtendingVideo,
  isTransformingVideo,
  showSuccess,
  canUndo,
  canRedo,
  undo,
  redo,
  setIsSettingsDialogOpen,
  customApiKey,
  toast,
}: CanvasControlPanelProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 md:absolute md:bottom-4 md:left-1/2 md:transform md:-translate-x-1/2 z-20 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:p-0 md:pb-0 md:max-w-[648px]">
      <div
        className={cn(
          "bg-card/95 backdrop-blur-lg rounded-3xl",
          "shadow-[0_0_0_1px_rgba(50,50,50,0.16),0_4px_8px_-0.5px_rgba(50,50,50,0.08),0_8px_16px_-2px_rgba(50,50,50,0.04)]",
          "dark:shadow-none dark:outline dark:outline-1 dark:outline-border"
        )}
      >
        <div className="flex flex-col gap-3 px-3 md:px-3 py-2 md:py-3 relative">
          {/* Active generations indicator */}
          <AnimatePresence mode="wait">
            {(activeGenerationsSize > 0 ||
              activeVideoGenerationsSize > 0 ||
              isGenerating ||
              isExtendingVideo ||
              isTransformingVideo ||
              showSuccess) && (
              <motion.div
                key={showSuccess ? "success" : "generating"}
                initial={{ opacity: 0, y: -10, scale: 0.9, x: "-50%" }}
                animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
                exit={{ opacity: 0, y: -10, scale: 0.9, x: "-50%" }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className={cn(
                  "absolute z-50 -top-16 left-1/2",
                  "rounded-xl",
                  showSuccess
                    ? "shadow-[0_0_0_1px_rgba(34,197,94,0.2),0_4px_8px_-0.5px_rgba(34,197,94,0.08),0_8px_16px_-2px_rgba(34,197,94,0.04)] dark:shadow-none dark:border dark:border-green-500/30"
                    : activeVideoGenerationsSize > 0 ||
                        isExtendingVideo ||
                        isTransformingVideo
                      ? "shadow-[0_0_0_1px_rgba(168,85,247,0.2),0_4px_8px_-0.5px_rgba(168,85,247,0.08),0_8px_16px_-2px_rgba(168,85,247,0.04)] dark:shadow-none dark:border dark:border-purple-500/30"
                      : "shadow-[0_0_0_1px_rgba(236,6,72,0.2),0_4px_8px_-0.5px_rgba(236,6,72,0.08),0_8px_16px_-2px_rgba(236,6,72,0.04)] dark:shadow-none dark:border dark:border-[#EC0648]/30"
                )}
              >
                <GenerationsIndicator
                  isAnimating={!showSuccess}
                  isSuccess={showSuccess}
                  className="w-5 h-5"
                  activeGenerationsSize={
                    activeGenerationsSize +
                    activeVideoGenerationsSize +
                    (isGenerating ? 1 : 0) +
                    (isExtendingVideo ? 1 : 0) +
                    (isTransformingVideo ? 1 : 0)
                  }
                  outputType={
                    activeVideoGenerationsSize > 0 ||
                    isExtendingVideo ||
                    isTransformingVideo
                      ? "video"
                      : "image"
                  }
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action buttons row */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "rounded-xl overflow-clip flex items-center",
                  "shadow-[0_0_0_1px_rgba(50,50,50,0.12),0_4px_8px_-0.5px_rgba(50,50,50,0.04),0_8px_16px_-2px_rgba(50,50,50,0.02)]",
                  "dark:shadow-none dark:border dark:border-border"
                )}
              >
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
                className={cn(
                  "h-9 rounded-xl overflow-clip flex items-center px-3",
                  "pointer-events-none select-none",
                  selectedIds.length > 0
                    ? "bg-blue-500/10 dark:bg-blue-500/15 shadow-[0_0_0_1px_rgba(59,130,246,0.2),0_4px_8px_-0.5px_rgba(59,130,246,0.08),0_8px_16px_-2px_rgba(59,130,246,0.04)] dark:shadow-none dark:border dark:border-blue-500/30"
                    : "bg-orange-500/10 dark:bg-orange-500/15 shadow-[0_0_0_1px_rgba(249,115,22,0.2),0_4px_8px_-0.5px_rgba(249,115,22,0.08),0_8px_16px_-2px_rgba(249,115,22,0.04)] dark:shadow-none dark:border dark:border-orange-500/30"
                )}
              >
                {selectedIds.length > 0 ? (
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <ImagesIcon className="w-4 h-4 text-blue-600 dark:text-blue-500" />
                    <span className="text-blue-600 dark:text-blue-500">
                      Generate Variations
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
            <div className="flex-1" />
            <div className="flex items-center gap-2">
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
                      {customApiKey && (
                        <div className="absolute size-2.5 -top-0.5 -right-0.5 bg-blue-500 rounded-full" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span>Settings</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="relative">
            <Textarea
              value={generationSettings.prompt}
              onChange={(e) =>
                setGenerationSettings({
                  ...generationSettings,
                  prompt: e.target.value,
                })
              }
              placeholder={`Enter a prompt... (${checkOS("Win") || checkOS("Linux") ? "Ctrl" : "⌘"}+Enter to run)`}
              className="w-full h-20 resize-none border-none p-2 pr-36"
              style={{ fontSize: "16px" }}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  if (
                    !isGenerating &&
                    (generationSettings.prompt.trim() || selectedIds.length > 0)
                  ) {
                    handleRun();
                  }
                }
              }}
            />

            {selectedIds.length > 0 && (
              <div className="absolute top-1 right-2 flex items-center justify-end">
                <div className="relative h-12 w-20">
                  {selectedIds.slice(0, 3).map((id, index) => {
                    const image = images.find((img) => img.id === id);
                    if (!image) return null;

                    const isLast =
                      index === Math.min(selectedIds.length - 1, 2);
                    const offset = index * 8;
                    const size = 40 - index * 4;
                    const topOffset = index * 2;

                    return (
                      <div
                        key={id}
                        className="absolute rounded-lg border border-border/20 bg-background overflow-hidden"
                        style={{
                          right: `${offset}px`,
                          top: `${topOffset}px`,
                          zIndex: 3 - index,
                          width: `${size}px`,
                          height: `${size}px`,
                        }}
                      >
                        <img
                          src={image.src}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                        {isLast && selectedIds.length > 3 && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-white text-xs font-medium">
                              +{selectedIds.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Style dropdown and Run button */}
          <div className="flex items-center justify-between">
            <div></div>

            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="border-none"
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "image/*";
                        input.multiple = true;
                        input.style.position = "fixed";
                        input.style.top = "-1000px";
                        input.style.left = "-1000px";
                        input.style.opacity = "0";
                        input.style.pointerEvents = "none";
                        input.style.width = "1px";
                        input.style.height = "1px";

                        input.onchange = (e) => {
                          try {
                            handleFileUpload(
                              (e.target as HTMLInputElement).files
                            );
                          } catch (error) {
                            console.error("File upload error:", error);
                            toast({
                              title: "Upload failed",
                              description: "Failed to process selected files",
                              variant: "destructive",
                            });
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

                        document.body.appendChild(input);
                        setTimeout(() => {
                          try {
                            input.click();
                          } catch (error) {
                            console.error(
                              "Failed to trigger file dialog:",
                              error
                            );
                            toast({
                              title: "Upload unavailable",
                              description:
                                "File upload is not available. Try using drag & drop instead.",
                              variant: "destructive",
                            });
                            if (input.parentNode) {
                              document.body.removeChild(input);
                            }
                          }
                        }, 10);

                        setTimeout(() => {
                          if (input.parentNode) {
                            document.body.removeChild(input);
                          }
                        }, 30000);
                      }}
                      title="Upload images"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <span>Upload</span>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleRun}
                      variant="primary"
                      size="icon"
                      disabled={
                        isGenerating ||
                        (selectedIds.length === 0 &&
                          !generationSettings.prompt.trim())
                      }
                      className={cn(
                        "gap-2 font-medium transition-all",
                        isGenerating && "bg-secondary"
                      )}
                    >
                      {isGenerating ? (
                        <SpinnerIcon className="h-4 w-4 animate-spin text-white" />
                      ) : (
                        <PlayIcon className="h-4 w-4 text-white fill-white" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex items-center gap-2">
                      <span>
                        {selectedIds.length === 1 &&
                        !generationSettings.prompt.trim()
                          ? "Generate Variations"
                          : "Run"}
                      </span>
                      <ShortcutBadge
                        variant="default"
                        size="xs"
                        shortcut={
                          checkOS("Win") || checkOS("Linux")
                            ? "ctrl+enter"
                            : "meta+enter"
                        }
                      />
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
