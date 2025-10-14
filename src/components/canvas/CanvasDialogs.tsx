"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";

interface CanvasDialogsProps {
  isImageToVideoDialogOpen: boolean;
  isSettingsDialogOpen: boolean;
  selectedImageForVideo: string | null;
  setIsImageToVideoDialogOpen: (open: boolean) => void;
  setIsSettingsDialogOpen: (open: boolean) => void;
  setSelectedImageForVideo: (id: string | null) => void;
  setShowGrid: (show: boolean) => void;
  setShowMinimap: (show: boolean) => void;
  setTheme: (theme: "system" | "light" | "dark") => void;
  showGrid: boolean;
  showMinimap: boolean;
  theme: string | undefined;
}

export function CanvasDialogs({
  isSettingsDialogOpen,
  setIsSettingsDialogOpen,
  setShowGrid,
  setShowMinimap,
  setTheme,
  showGrid,
  showMinimap,
  theme,
}: CanvasDialogsProps) {
  return (
    <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex justify-between">
            <div className="flex flex-col gap-2">
              <Label htmlFor="appearance">Appearance</Label>
              <p className="text-sm text-muted-foreground">
                Customize how canvas looks on your device.
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
  );
}
