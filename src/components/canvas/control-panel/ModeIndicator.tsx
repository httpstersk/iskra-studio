"use client";

import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  CONTROL_PANEL_STRINGS,
  CONTROL_PANEL_STYLES,
} from "@/constants/control-panel";
import { cn } from "@/lib/utils";
import { ImagesIcon, PlayIcon } from "lucide-react";

/**
 * Props for the ModeIndicator component
 */
interface ModeIndicatorProps {
  handleVariationModeChange: (mode: "image" | "video") => void;
  hasSelection: boolean;
  imageVariationType?: "camera-angles" | "b-rolls";
  setImageVariationType?: (type: "camera-angles" | "b-rolls") => void;
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
          CONTROL_PANEL_STYLES.ORANGE_BADGE
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
      <SegmentedControl
        value={variationMode}
        onValueChange={(value) =>
          handleVariationModeChange(value as "image" | "video")
        }
        options={[
          { value: "image", label: "Image", icon: ImagesIcon },
          { value: "video", label: "Video", icon: PlayIcon },
        ]}
        activeColor="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
        inactiveColor="text-gray-600 dark:text-gray-400"
        className="h-9"
      />

      {/* Camera Angles vs B-rolls switcher - only show in Image mode */}
      {variationMode === "image" && setImageVariationType && (
        <SegmentedControl
          value={imageVariationType}
          onValueChange={(value) =>
            setImageVariationType(value as "camera-angles" | "b-rolls")
          }
          options={[
            { value: "camera-angles", label: "Camera Angles" },
            { value: "b-rolls", label: "B-rolls" },
          ]}
          activeColor="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
          inactiveColor="text-gray-600 dark:text-gray-400"
          className="h-9"
        />
      )}
    </>
  );
}
