import React from "react";
import type { PlacedImage } from "@/types/canvas";
import {
  canvasToScreen,
  calculateBoundingBox,
  type Viewport,
} from "@/utils/canvas-utils";

interface DimensionDisplayProps {
  selectedImages: PlacedImage[];
  viewport: Viewport;
}

export const DimensionDisplay: React.FC<DimensionDisplayProps> = ({
  selectedImages,
  viewport,
}) => {
  const hasSingleSelection = selectedImages.length === 1;
  const image = hasSingleSelection ? selectedImages[0] : null;

  /**
   * Get the natural (API) dimensions that get sent to generation endpoints.
   * Uses cached dimensions if available, otherwise falls back to display dimensions.
   * We show natural dimensions instead of display dimensions because:
   * - They represent the actual pixel data AI models process
   * - They're consistent regardless of canvas zoom/scaling
   * - Users need to know the true resolution for generation quality
   */
  const getApiDimensions = React.useMemo(() => {
    if (!image) return null;

    // Use cached natural dimensions if available
    if (image.naturalWidth !== undefined && image.naturalHeight !== undefined) {
      return {
        width: Math.round(image.naturalWidth),
        height: Math.round(image.naturalHeight),
      };
    }

    // Fallback to display dimensions if natural dimensions aren't cached
    return {
      width: Math.round(image.width),
      height: Math.round(image.height),
    };
  }, [image]);

  if (!hasSingleSelection || !image || !getApiDimensions) return null;

  // Get rotation-aware bottom center position using bounding box
  const boundingBox = calculateBoundingBox(image);
  const { x: screenX, y: screenY } = canvasToScreen(
    boundingBox.x + boundingBox.width / 2,
    boundingBox.y + boundingBox.height,
    viewport,
  );

  return (
    <div
      className="fixed pointer-events-none z-10 bg-background/90 backdrop-blur-sm border rounded-xl px-2 py-1 text-xs text-foreground/80 shadow-sm hidden md:block"
      style={{
        left: screenX,
        top: screenY + 8, // 8px below the image
        transform: "translateX(-50%)", // Center horizontally under the image
      }}
    >
      <div className="flex flex-col gap-0.5">
        <div className="font-medium">
          {getApiDimensions.width} × {getApiDimensions.height} px
        </div>
      </div>
    </div>
  );
};
