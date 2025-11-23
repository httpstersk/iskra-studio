/**
 * Visual connector that draws lines between selected images on the canvas.
 * 
 * This component provides immediate visual feedback when multiple images are selected,
 * helping users understand which images are grouped for multi-image operations
 * (e.g., dual-reference image generation).
 * 
 * @remarks
 * - Only renders when 2 or more images are selected
 * - Connects image centers with a dashed line
 * - Updates in real-time as images are dragged
 * - Uses viewport culling for performance optimization
 * 
 * @example
 * ```tsx
 * <SelectionConnector
 *   images={canvasImages}
 *   selectedIds={['img-1', 'img-2']}
 * />
 * ```
 */

import type { PlacedImage } from "@/types/canvas";
import React, { useMemo } from "react";
import { Line } from "react-konva";

/**
 * Style constants for the selection connector line
 */
const SELECTION_CONNECTOR_STYLE = {
    /** Dash pattern: [dash length, gap length] */
    DASH: [10, 5] as number[],
    /** Minimum number of images required to show connector */
    MIN_SELECTION_COUNT: 2,
    /** Line opacity (0-1) */
    OPACITY: 0.7,
    /** Line color (Tailwind blue-500) */
    STROKE_COLOR: "#3b82f6",
    /** Line width in pixels */
    STROKE_WIDTH: 2,
} as const;

/**
 * Props for the SelectionConnector component
 */
interface SelectionConnectorProps {
    /** All images on the canvas */
    images: PlacedImage[];
    /** IDs of currently selected images */
    selectedIds: string[];
}

/**
 * Calculates the center point of an image
 * @param img - Image to calculate center for
 * @returns Tuple of [x, y] coordinates
 */
function getImageCenter(img: PlacedImage): [number, number] {
    return [img.x + img.width / 2, img.y + img.height / 2];
}

export const SelectionConnector = React.memo(function SelectionConnector({
    images,
    selectedIds,
}: SelectionConnectorProps) {
    const selectedImages = useMemo(
        () => images.filter((img) => selectedIds.includes(img.id)),
        [images, selectedIds]
    );

    if (selectedImages.length < SELECTION_CONNECTOR_STYLE.MIN_SELECTION_COUNT) {
        return null;
    }

    const points = selectedImages.flatMap(getImageCenter);

    return (
        <Line
            dash={SELECTION_CONNECTOR_STYLE.DASH}
            listening={false}
            opacity={SELECTION_CONNECTOR_STYLE.OPACITY}
            perfectDrawEnabled={false}
            points={points}
            stroke={SELECTION_CONNECTOR_STYLE.STROKE_COLOR}
            strokeWidth={SELECTION_CONNECTOR_STYLE.STROKE_WIDTH}
        />
    );
});
