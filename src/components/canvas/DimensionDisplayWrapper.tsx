/**
 * DimensionDisplayWrapper component - Memoized wrapper for DimensionDisplay
 *
 * Prevents unnecessary rerenders by memoizing the filtered images calculation.
 *
 * @module components/canvas/DimensionDisplayWrapper
 */

"use client";

import type { Viewport } from "@/hooks/useCanvasState";
import type { PlacedImage } from "@/types/canvas";
import React, { useMemo } from "react";
import { DimensionDisplay } from "./DimensionDisplay";

/**
 * Props for the DimensionDisplayWrapper component
 */
interface DimensionDisplayWrapperProps {
  images: PlacedImage[];
  selectedIds: string[];
  viewport: Viewport;
}

/**
 * Memoized wrapper for DimensionDisplay with optimized selectedImages calculation.
 *
 * @component
 */
export const DimensionDisplayWrapper = React.memo<DimensionDisplayWrapperProps>(
  function DimensionDisplayWrapper({ images, selectedIds, viewport }) {
    const selectedImages = useMemo(
      () => images.filter((img) => selectedIds.includes(img.id)),
      [images, selectedIds],
    );

    return <DimensionDisplay selectedImages={selectedImages} viewport={viewport} />;
  },
);
