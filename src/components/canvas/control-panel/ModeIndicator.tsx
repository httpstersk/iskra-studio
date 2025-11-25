"use client";

import {
  CONTROL_PANEL_STRINGS,
  CONTROL_PANEL_STYLES,
} from "@/constants/control-panel";
import { cn } from "@/lib/utils";
import { SegmentedControl } from "@radix-ui/themes";
import {
  CctvIcon,
  ImagesIcon,
  Lightbulb,
  PaintBucketIcon,
  PlayIcon,
  BookOpen,
  UserIcon,
  SmileIcon,
  Layers,
  CloudIcon,
} from "lucide-react";

/**
 * Props for the ModeIndicator component
 */
interface ModeIndicatorProps {
  handleVariationModeChange: (mode: "image" | "video") => void;
  hasSelection: boolean;
  imageVariationType?:
    | "camera-angles"
    | "director"
    | "lighting"
    | "storyline"
    | "characters"
    | "emotions"
    | "surface"
    | "weather";
  setImageVariationType?: (
    type:
      | "camera-angles"
      | "director"
      | "lighting"
      | "storyline"
      | "characters"
      | "emotions"
      | "surface"
      | "weather",
  ) => void;
  variationMode: "image" | "video";
}

/**
 * Mode indicator badge with image/video switch
 */
export function ModeIndicator({
  handleVariationModeChange,
  hasSelection,
  imageVariationType = "camera-angles",
  setImageVariationType,
  variationMode,
}: ModeIndicatorProps) {
  if (!hasSelection) {
    return (
      <div
        className={cn(
          "h-9 rounded-xl overflow-clip flex items-center px-3",
          "pointer-events-none select-none",
          CONTROL_PANEL_STYLES.ORANGE_BADGE,
        )}
      >
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="text-orange-600 dark:text-orange-500 font-bold text-sm">
            T
          </span>
          <span className="text-orange-600 dark:text-orange-500">
            {CONTROL_PANEL_STRINGS.TEXT_TO_IMAGE}
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <SegmentedControl.Root
        className="flex flex-1"
        value={variationMode}
        onValueChange={(value) =>
          handleVariationModeChange(value as "image" | "video")
        }
        size="1"
      >
        <SegmentedControl.Item value="image">
          <div className="flex flex-row items-center gap-1.5">
            <ImagesIcon className="size-3.5" />
            <span className="text-xs">Image</span>
          </div>
        </SegmentedControl.Item>
        <SegmentedControl.Item value="video">
          <div className="flex flex-row items-center gap-1.5">
            <PlayIcon className="size-3.5" />
            <span className="text-xs">Video</span>
          </div>
        </SegmentedControl.Item>
      </SegmentedControl.Root>

      {/* Camera Angles vs Director vs Lighting switcher - only show in Image mode */}
      {variationMode === "image" && setImageVariationType && (
        <SegmentedControl.Root
          size="1"
          value={imageVariationType}
          onValueChange={(value) =>
            setImageVariationType(
              value as
                | "camera-angles"
                | "director"
                | "lighting"
                | "storyline"
                | "characters"
                | "emotions"
                | "surface"
                | "weather",
            )
          }
        >
          <SegmentedControl.Item value="camera-angles">
            <div className="flex flex-row items-center gap-1.5">
              <CctvIcon className="size-3.5" />
              <span className="text-xs whitespace-nowrap">Angles</span>
            </div>
          </SegmentedControl.Item>
          <SegmentedControl.Item value="director">
            <div className="flex flex-row items-center gap-1.5">
              <PaintBucketIcon className="size-3.5" />
              <span className="text-xs whitespace-nowrap">Styles</span>
            </div>
          </SegmentedControl.Item>
          <SegmentedControl.Item value="lighting">
            <div className="flex flex-row items-center gap-1.5">
              <Lightbulb className="size-3.5" />
              <span className="text-xs whitespace-nowrap">Lighting</span>
            </div>
          </SegmentedControl.Item>
          <SegmentedControl.Item value="storyline">
            <div className="flex flex-row items-center gap-1.5">
              <BookOpen className="size-3.5" />
              <span className="text-xs whitespace-nowrap">Storyline</span>
            </div>
          </SegmentedControl.Item>
          <SegmentedControl.Item value="characters">
            <div className="flex flex-row items-center gap-1.5">
              <UserIcon className="size-3.5" />
              <span className="text-xs whitespace-nowrap">Characters</span>
            </div>
          </SegmentedControl.Item>
          <SegmentedControl.Item value="emotions">
            <div className="flex flex-row items-center gap-1.5">
              <SmileIcon className="size-3.5" />
              <span className="text-xs whitespace-nowrap">Emotions</span>
            </div>
          </SegmentedControl.Item>
          <SegmentedControl.Item value="surface">
            <div className="flex flex-row items-center gap-1.5">
              <Layers className="size-3.5" />
              <span className="text-xs whitespace-nowrap">Surface</span>
            </div>
          </SegmentedControl.Item>
          <SegmentedControl.Item value="weather">
            <div className="flex flex-row items-center gap-1.5">
              <CloudIcon className="size-3.5" />
              <span className="text-xs whitespace-nowrap">Weather</span>
            </div>
          </SegmentedControl.Item>
        </SegmentedControl.Root>
      )}
    </>
  );
}
