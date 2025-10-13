"use client";

import { Switch } from "@/components/ui/switch";
import { CONTROL_PANEL_STRINGS, CONTROL_PANEL_STYLES } from "@/constants/control-panel";
import { cn } from "@/lib/utils";
import { ImagesIcon, PlayIcon } from "lucide-react";

/**
 * Props for the ModeIndicator component
 */
interface ModeIndicatorProps {
  handleVariationModeChange: (mode: "image" | "video") => void;
  hasSelection: boolean;
  variationMode: "image" | "video";
}

/**
 * Mode indicator badge with image/video switch
 */
export function ModeIndicator({
  handleVariationModeChange,
  hasSelection,
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
            <ImagesIcon className="w-4 h-4 text-blue-600 dark:text-blue-500" />
            <span className="text-blue-600 dark:text-blue-500">
              {CONTROL_PANEL_STRINGS.IMAGE_MODE}
            </span>
          </>
        ) : (
          <>
            <PlayIcon className="w-4 h-4 text-purple-600 dark:text-purple-500 fill-purple-600 dark:fill-purple-500" />
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
  );
}
