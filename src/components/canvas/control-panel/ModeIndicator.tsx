"use client";

import { Switch } from "@/components/ui/switch";
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
      <div
        className={cn(
          "h-9 rounded-xl overflow-clip flex items-center gap-2 px-3",
          variationMode === "image"
            ? CONTROL_PANEL_STYLES.BLUE_BADGE
            : CONTROL_PANEL_STYLES.PURPLE_BADGE
        )}
      >
        <div className="flex items-center gap-2 text-xs font-medium">
          {variationMode === "image" ? (
            <>
              <ImagesIcon className="size-4 min-w-4 text-blue-600 dark:text-blue-500" />
              <span className="text-blue-600 dark:text-blue-500">
                {CONTROL_PANEL_STRINGS.IMAGE_MODE}
              </span>
            </>
          ) : (
            <>
              <PlayIcon className="size-4 min-w-4 text-purple-600 dark:text-purple-500 fill-purple-600 dark:fill-purple-500" />
              <span className="text-purple-600 dark:text-purple-500">
                {CONTROL_PANEL_STRINGS.VIDEO_MODE}
              </span>
            </>
          )}
        </div>

        <Switch
          checked={variationMode === "video"}
          className="h-5 w-9 data-[state=checked]:bg-purple-600 data-[state=unchecked]:bg-blue-600"
          onCheckedChange={(checked) => {
            handleVariationModeChange(checked ? "video" : "image");
          }}
        />
      </div>

      {/* Camera Angles vs B-rolls switcher - only show in Image mode */}
      {variationMode === "image" && setImageVariationType && (
        <div
          className={cn(
            "h-9 rounded-xl overflow-clip flex items-center gap-2 px-3",
            imageVariationType === "camera-angles"
              ? CONTROL_PANEL_STYLES.ORANGE_BADGE
              : "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30"
          )}
        >
          <div className="flex items-center gap-1.5 text-xs font-medium">
            <span
              className={cn(
                "text-xs",
                imageVariationType === "camera-angles"
                  ? "text-orange-600 dark:text-orange-500"
                  : "text-emerald-600 dark:text-emerald-500"
              )}
            >
              {imageVariationType === "camera-angles" ? "Angles" : "B-rolls"}
            </span>

            <Switch
              checked={imageVariationType === "b-rolls"}
              className="h-5 w-9 data-[state=checked]:bg-emerald-600 data-[state=unchecked]:bg-orange-600"
              key={imageVariationType}
              onCheckedChange={(checked) => {
                const newType = checked ? "b-rolls" : "camera-angles";
                setImageVariationType(newType);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
