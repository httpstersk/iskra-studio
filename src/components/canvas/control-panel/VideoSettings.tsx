"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SegmentedControl } from "@radix-ui/themes";
import {
  CONTROL_PANEL_STRINGS,
  CONTROL_PANEL_STYLES,
  VIDEO_DURATION_OPTIONS,
} from "@/constants/control-panel";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

/**
 * Props for the VideoSettings component
 */
interface VideoSettingsProps {
  setUseSoraPro: (value: boolean) => void;
  setVideoDuration: (value: "4" | "8" | "12") => void;
  useSoraPro: boolean;
  videoDuration: "4" | "8" | "12";
}

/**
 * Video-specific settings controls (Pro toggle and Duration selector)
 */
export function VideoSettings({
  setUseSoraPro,
  setVideoDuration,
  useSoraPro,
  videoDuration,
}: VideoSettingsProps) {
  return (
    <>
      {/* Sora Pro toggle */}
      <SegmentedControl.Root
        size="1"
        value={useSoraPro ? "pro" : "off"}
        onValueChange={(value) => setUseSoraPro(value === "pro")}
      >
        <SegmentedControl.Item value="off">
          <span className="text-xs">Normal</span>
        </SegmentedControl.Item>
        <SegmentedControl.Item value="pro">
          <span className="text-xs">Pro</span>
        </SegmentedControl.Item>
      </SegmentedControl.Root>

      {/* Duration selector */}
      <div
        className={cn(
          "h-9 rounded-xl overflow-clip flex items-center gap-2 px-2",
          CONTROL_PANEL_STYLES.SLATE_BADGE
        )}
      >
        <Clock className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
        <Select
          onValueChange={(value) => setVideoDuration(value as "4" | "8" | "12")}
          value={videoDuration}
        >
          <SelectTrigger className="h-6 border-none shadow-none bg-transparent text-xs font-medium text-slate-600 dark:text-slate-400 w-[60px] px-1">
            <SelectValue />
          </SelectTrigger>

          <SelectContent className="rounded-xl">
            {VIDEO_DURATION_OPTIONS.map((option) => (
              <SelectItem
                className="text-xs rounded-lg"
                key={option.value}
                value={option.value}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
