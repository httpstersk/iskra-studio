"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Check, Plus, SunIcon, MoonIcon, MonitorIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { styleModels } from "@/lib/models";
import { ImageToVideoDialog } from "./ImageToVideoDialog";
import { VideoToVideoDialog } from "./VideoToVideoDialog";
import { ExtendVideoDialog } from "./ExtendVideoDialog";
import { RemoveVideoBackgroundDialog } from "./VideoModelComponents";
import type { GenerationSettings, VideoGenerationSettings } from "@/types/canvas";

interface CanvasDialogsProps {
  // Settings Dialog
  isSettingsDialogOpen: boolean;
  setIsSettingsDialogOpen: (open: boolean) => void;
  customApiKey: string;
  setCustomApiKey: (key: string) => void;
  tempApiKey: string;
  setTempApiKey: (key: string) => void;
  theme: string | undefined;
  setTheme: (theme: "system" | "light" | "dark") => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  showMinimap: boolean;
  setShowMinimap: (show: boolean) => void;
  toast: any;

  // Style Dialog
  isStyleDialogOpen: boolean;
  setIsStyleDialogOpen: (open: boolean) => void;
  generationSettings: GenerationSettings;
  setGenerationSettings: (settings: GenerationSettings) => void;

  // Image to Video Dialog
  isImageToVideoDialogOpen: boolean;
  setIsImageToVideoDialogOpen: (open: boolean) => void;
  selectedImageForVideo: string | null;
  setSelectedImageForVideo: (id: string | null) => void;
  handleImageToVideoConversion: (settings: VideoGenerationSettings) => void;
  images: any[];
  isConvertingToVideo: boolean;

  // Video to Video Dialog
  isVideoToVideoDialogOpen: boolean;
  setIsVideoToVideoDialogOpen: (open: boolean) => void;
  selectedVideoForVideo: string | null;
  setSelectedVideoForVideo: (id: string | null) => void;
  handleVideoToVideoTransformation: (settings: VideoGenerationSettings) => void;
  videos: any[];
  isTransformingVideo: boolean;

  // Extend Video Dialog
  isExtendVideoDialogOpen: boolean;
  setIsExtendVideoDialogOpen: (open: boolean) => void;
  selectedVideoForExtend: string | null;
  setSelectedVideoForExtend: (id: string | null) => void;
  handleVideoExtension: (settings: VideoGenerationSettings) => void;
  isExtendingVideo: boolean;

  // Remove Video Background Dialog
  isRemoveVideoBackgroundDialogOpen: boolean;
  setIsRemoveVideoBackgroundDialogOpen: (open: boolean) => void;
  selectedVideoForBackgroundRemoval: string | null;
  setSelectedVideoForBackgroundRemoval: (id: string | null) => void;
  handleVideoBackgroundRemoval: (backgroundColor: string) => void;
  isRemovingVideoBackground: boolean;
}

export function CanvasDialogs({
  isSettingsDialogOpen,
  setIsSettingsDialogOpen,
  customApiKey,
  setCustomApiKey,
  tempApiKey,
  setTempApiKey,
  theme,
  setTheme,
  showGrid,
  setShowGrid,
  showMinimap,
  setShowMinimap,
  toast,
  isStyleDialogOpen,
  setIsStyleDialogOpen,
  generationSettings,
  setGenerationSettings,
  isImageToVideoDialogOpen,
  setIsImageToVideoDialogOpen,
  selectedImageForVideo,
  setSelectedImageForVideo,
  handleImageToVideoConversion,
  images,
  isConvertingToVideo,
  isVideoToVideoDialogOpen,
  setIsVideoToVideoDialogOpen,
  selectedVideoForVideo,
  setSelectedVideoForVideo,
  handleVideoToVideoTransformation,
  videos,
  isTransformingVideo,
  isExtendVideoDialogOpen,
  setIsExtendVideoDialogOpen,
  selectedVideoForExtend,
  setSelectedVideoForExtend,
  handleVideoExtension,
  isExtendingVideo,
  isRemoveVideoBackgroundDialogOpen,
  setIsRemoveVideoBackgroundDialogOpen,
  selectedVideoForBackgroundRemoval,
  setSelectedVideoForBackgroundRemoval,
  handleVideoBackgroundRemoval,
  isRemovingVideoBackground,
}: CanvasDialogsProps) {
  return (
    <>
      {/* Settings Dialog */}
      <Dialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
      >
        <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Settings</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">FAL API Key</Label>
                <p className="text-sm text-muted-foreground">
                  Add your own FAL API key to bypass rate limits and use your
                  own quota.
                </p>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="Enter your API key"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  className="font-mono"
                  style={{ fontSize: "16px" }}
                />
                <p className="text-xs text-muted-foreground">
                  Get your API key from{" "}
                  <Link
                    href="https://fal.ai/dashboard/keys"
                    target="_blank"
                    className="underline hover:text-foreground"
                  >
                    fal.ai/dashboard/keys
                  </Link>
                </p>
              </div>

              {customApiKey && (
                <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3">
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <Check className="h-4 w-4" />
                    <span>Currently using custom API key</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setCustomApiKey("");
                    setTempApiKey("");
                    toast({
                      title: "API key removed",
                      description: "Using default rate-limited API",
                    });
                  }}
                  disabled={!customApiKey}
                >
                  Remove Key
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setTempApiKey(customApiKey);
                      setIsSettingsDialogOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      const trimmedKey = tempApiKey.trim();
                      if (trimmedKey) {
                        setCustomApiKey(trimmedKey);
                        setIsSettingsDialogOpen(false);
                        toast({
                          title: "API key saved",
                          description: "Your custom API key is now active",
                        });
                      } else if (trimmedKey) {
                        toast({
                          title: "Invalid API key",
                          description: "FAL API keys should start with 'fal_'",
                          variant: "destructive",
                        });
                      }
                    }}
                    disabled={!tempApiKey.trim()}
                  >
                    Save Key
                  </Button>
                </div>
              </div>
            </div>

            <div className="h-px bg-border/40" />

            <div className="flex justify-between">
              <div className="flex flex-col gap-2">
                <Label htmlFor="appearance">Appearance</Label>
                <p className="text-sm text-muted-foreground">
                  Customize how infinite-kanvas looks on your device.
                </p>
              </div>
              <Select
                value={theme || "system"}
                onValueChange={(value: "system" | "light" | "dark") =>
                  setTheme(value)
                }
              >
                <SelectTrigger className="max-w-[140px] rounded-xl">
                  <div className="flex items-center gap-2">
                    {theme === "light" ? (
                      <SunIcon className="size-4" />
                    ) : theme === "dark" ? (
                      <MoonIcon className="size-4" />
                    ) : (
                      <MonitorIcon className="size-4" />
                    )}
                    <span className="capitalize">{theme || "system"}</span>
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="system" className="rounded-lg">
                    <div className="flex items-center gap-2">
                      <MonitorIcon className="size-4" />
                      <span>System</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="light" className="rounded-lg">
                    <div className="flex items-center gap-2">
                      <SunIcon className="size-4" />
                      <span>Light</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="dark" className="rounded-lg">
                    <div className="flex items-center gap-2">
                      <MoonIcon className="size-4" />
                      <span>Dark</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-between">
              <div className="flex flex-col gap-2">
                <Label htmlFor="grid">Show Grid</Label>
                <p className="text-sm text-muted-foreground">
                  Show a grid on the canvas to help you align your images.
                </p>
              </div>
              <Switch
                id="grid"
                checked={showGrid}
                onCheckedChange={setShowGrid}
              />
            </div>

            <div className="flex justify-between">
              <div className="flex flex-col gap-2">
                <Label htmlFor="minimap">Show Minimap</Label>
                <p className="text-sm text-muted-foreground">
                  Show a minimap in the corner to navigate the canvas.
                </p>
              </div>
              <Switch
                id="minimap"
                checked={showMinimap}
                onCheckedChange={setShowMinimap}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Style Selection Dialog */}
      <Dialog open={isStyleDialogOpen} onOpenChange={setIsStyleDialogOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Choose a Style</DialogTitle>
            <DialogDescription>
              Select a style to apply to your images or choose Custom to use
              your own LoRA
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <div className="pointer-events-none absolute -top-[1px] left-0 right-0 z-30 h-4 md:h-12 bg-gradient-to-b from-background via-background/90 to-transparent" />
            <div className="pointer-events-none absolute -bottom-[1px] left-0 right-0 z-30 h-4 md:h-12 bg-gradient-to-t from-background via-background/90 to-transparent" />

            <div className="overflow-y-auto max-h-[60vh] px-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-4 pb-6 md:pt-8 md:pb-12">
                <button
                  onClick={() => {
                    setGenerationSettings({
                      ...generationSettings,
                      loraUrl: "",
                      prompt: "",
                      styleId: "custom",
                    });
                    setIsStyleDialogOpen(false);
                  }}
                  className={cn(
                    "group relative flex flex-col items-center gap-2 p-3 rounded-xl border",
                    generationSettings.styleId === "custom"
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center">
                    <Plus className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <span className="text-sm font-medium">Custom</span>
                </button>

                {styleModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => {
                      setGenerationSettings({
                        ...generationSettings,
                        loraUrl: model.loraUrl || "",
                        prompt: model.prompt,
                        styleId: model.id,
                      });
                      setIsStyleDialogOpen(false);
                    }}
                    className={cn(
                      "group relative flex flex-col items-center gap-2 p-3 rounded-xl border",
                      generationSettings.styleId === model.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="relative w-full aspect-square rounded-lg overflow-hidden">
                      <Image
                        src={model.imageSrc}
                        alt={model.name}
                        width={200}
                        height={200}
                        className="w-full h-full object-cover"
                      />
                      {generationSettings.styleId === model.id && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center"></div>
                      )}
                    </div>
                    <span className="text-sm font-medium text-center">
                      {model.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Video Dialogs */}
      <ImageToVideoDialog
        isOpen={isImageToVideoDialogOpen}
        onClose={() => {
          setIsImageToVideoDialogOpen(false);
          setSelectedImageForVideo(null);
        }}
        onConvert={handleImageToVideoConversion}
        imageUrl={
          selectedImageForVideo
            ? images.find((img) => img.id === selectedImageForVideo)?.src || ""
            : ""
        }
        isConverting={isConvertingToVideo}
      />

      <VideoToVideoDialog
        isOpen={isVideoToVideoDialogOpen}
        onClose={() => {
          setIsVideoToVideoDialogOpen(false);
          setSelectedVideoForVideo(null);
        }}
        onConvert={handleVideoToVideoTransformation}
        videoUrl={
          selectedVideoForVideo
            ? videos.find((vid) => vid.id === selectedVideoForVideo)?.src || ""
            : ""
        }
        isConverting={isTransformingVideo}
      />

      <ExtendVideoDialog
        isOpen={isExtendVideoDialogOpen}
        onClose={() => {
          setIsExtendVideoDialogOpen(false);
          setSelectedVideoForExtend(null);
        }}
        onExtend={handleVideoExtension}
        videoUrl={
          selectedVideoForExtend
            ? videos.find((vid) => vid.id === selectedVideoForExtend)?.src || ""
            : ""
        }
        isExtending={isExtendingVideo}
      />

      <RemoveVideoBackgroundDialog
        isOpen={isRemoveVideoBackgroundDialogOpen}
        onClose={() => {
          setIsRemoveVideoBackgroundDialogOpen(false);
          setSelectedVideoForBackgroundRemoval(null);
        }}
        onProcess={handleVideoBackgroundRemoval}
        videoUrl={
          selectedVideoForBackgroundRemoval
            ? videos.find((vid) => vid.id === selectedVideoForBackgroundRemoval)
                ?.src || ""
            : ""
        }
        videoDuration={
          selectedVideoForBackgroundRemoval
            ? videos.find((vid) => vid.id === selectedVideoForBackgroundRemoval)
                ?.duration || 0
            : 0
        }
        isProcessing={isRemovingVideoBackground}
      />
    </>
  );
}
