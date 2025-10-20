"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { downloadImagesAsZip } from "@/utils/download-utils";
import type { PlacedImage } from "@/types/canvas";
import { Download } from "lucide-react";
import { useState } from "react";

/**
 * Constants for DownloadAllButton component
 */
const DOWNLOAD_BUTTON_CONSTANTS = {
  DOWNLOADING_TEXT: "Downloading...",
  DOWNLOAD_FAILED_DESC: "Failed to download images. Please try again.",
  DOWNLOAD_FAILED_TITLE: "Download Failed",
  DOWNLOAD_SUCCESS_DESC: "Images downloaded successfully",
  DOWNLOAD_SUCCESS_TITLE: "Download Complete",
  TOOLTIP_TEXT: "Download All",
} as const;

/**
 * Props for the DownloadAllButton component
 */
interface DownloadAllButtonProps {
  images: PlacedImage[];
  selectedIds: string[];
  toast: (props: {
    description?: string;
    title: string;
    variant?: "default" | "destructive";
  }) => void;
}

/**
 * DownloadAllButton component - downloads selected images as a zip file
 */
export function DownloadAllButton({
  images,
  selectedIds,
  toast,
}: DownloadAllButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (isDownloading) return;

    setIsDownloading(true);

    try {
      await downloadImagesAsZip(images, selectedIds);

      toast({
        description: DOWNLOAD_BUTTON_CONSTANTS.DOWNLOAD_SUCCESS_DESC,
        title: DOWNLOAD_BUTTON_CONSTANTS.DOWNLOAD_SUCCESS_TITLE,
      });
    } catch (error) {
      console.error("Download error:", error);

      toast({
        description: DOWNLOAD_BUTTON_CONSTANTS.DOWNLOAD_FAILED_DESC,
        title: DOWNLOAD_BUTTON_CONSTANTS.DOWNLOAD_FAILED_TITLE,
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button
            disabled={isDownloading}
            onClick={handleDownload}
            size="icon"
            title={DOWNLOAD_BUTTON_CONSTANTS.TOOLTIP_TEXT}
            variant="ghost"
          >
            <Download className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <span>
            {isDownloading
              ? DOWNLOAD_BUTTON_CONSTANTS.DOWNLOADING_TEXT
              : DOWNLOAD_BUTTON_CONSTANTS.TOOLTIP_TEXT}
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
