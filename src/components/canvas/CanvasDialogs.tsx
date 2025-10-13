"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { PlacedImage, VideoGenerationSettings } from "@/types/canvas";
import { Check, MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import Link from "next/link";
import { ImageToVideoDialog } from "./ImageToVideoDialog";

interface CanvasDialogsProps {
  // Settings Dialog
  isSettingsDialogOpen: boolean;
  setIsSettingsDialogOpen: (open: boolean) => void;
  theme: string | undefined;
  setTheme: (theme: "system" | "light" | "dark") => void;
  showGrid: boolean;
  setShowGrid: (show: boolean) => void;
  showMinimap: boolean;
  setShowMinimap: (show: boolean) => void;
  toast: (props: {
    title: string;
    description?: string;
    variant?: "default" | "destructive";
  }) => void;

  // Image to Video Dialog
  isImageToVideoDialogOpen: boolean;
  setIsImageToVideoDialogOpen: (open: boolean) => void;
  selectedImageForVideo: string | null;
  setSelectedImageForVideo: (id: string | null) => void;
  handleImageToVideoConversion: (settings: VideoGenerationSettings) => void;
  images: PlacedImage[];
  isConvertingToVideo: boolean;
  useSoraPro: boolean;
  videoDuration: "4" | "8" | "12";
  videoResolution: "auto" | "720p" | "1080p";
}

export function CanvasDialogs({
  isSettingsDialogOpen,
  setIsSettingsDialogOpen,
  theme,
  setTheme,
  showGrid,
  setShowGrid,
  showMinimap,
  setShowMinimap,
  toast,
  isImageToVideoDialogOpen,
  setIsImageToVideoDialogOpen,
  selectedImageForVideo,
  setSelectedImageForVideo,
  handleImageToVideoConversion,
  images,
  isConvertingToVideo,
  useSoraPro,
  videoDuration,
  videoResolution,
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
            {/* Appearance and display settings only; API key input removed */}

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
        useSoraPro={useSoraPro}
        videoDuration={videoDuration}
        videoResolution={videoResolution}
      />
    </>
  );
}
