/**
 * SelectionConnector component
 * 
 * Draws visual connections between selected images on the canvas
 * to indicate they are linked for multi-image operations.
 */

import type { PlacedImage } from "@/types/canvas";
import React, { useMemo } from "react";
import { Line } from "react-konva";

interface SelectionConnectorProps {
    images: PlacedImage[];
    selectedIds: string[];
}

export const SelectionConnector = React.memo(function SelectionConnector({
    images,
    selectedIds,
}: SelectionConnectorProps) {
    const selectedImages = useMemo(
        () => images.filter((img) => selectedIds.includes(img.id)),
        [images, selectedIds]
    );

    // Only render if 2 or more images are selected
    if (selectedImages.length < 2) return null;

    // Calculate center points of selected images
    const points = selectedImages.flatMap((img) => [
        img.x + img.width / 2,
        img.y + img.height / 2,
    ]);

    return (
        <Line
            points={points}
            stroke="#3b82f6" // blue-500
            strokeWidth={2}
            dash={[10, 5]}
            listening={false}
            perfectDrawEnabled={false}
            opacity={0.7}
        />
    );
});
