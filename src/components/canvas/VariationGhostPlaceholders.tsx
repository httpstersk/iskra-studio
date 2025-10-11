import React from "react";
import { Rect, Group, Text } from "react-konva";
import type { PlacedImage } from "@/types/canvas";
import { calculateBalancedPosition } from "@/lib/handlers/variation-handler";
import { snapPosition } from "@/utils/snap-utils";

interface VariationGhostPlaceholdersProps {
  selectedImage: PlacedImage;
  variationMode?: "image" | "video";
}

/**
 * Renders ghost placeholder outlines showing where variations will be generated
 * Appears when a single image is selected (variation mode)
 * Shows 8 placeholders for image mode, 4 for video mode
 */
export const VariationGhostPlaceholders: React.FC<
  VariationGhostPlaceholdersProps
> = ({ selectedImage, variationMode = "image" }) => {
  // Snap the source image position to grid first to ensure edge-to-edge alignment
  const snappedSource = snapPosition(selectedImage.x, selectedImage.y);

  const ghostCount = variationMode === "image" ? 8 : 4;
  const ghostPlaceholders = Array.from({ length: ghostCount }, (_, i) => {
    // Calculate position based on snapped source position
    const position = calculateBalancedPosition(
      snappedSource.x,
      snappedSource.y,
      i,
      selectedImage.width,
      selectedImage.height,
      selectedImage.width,
      selectedImage.height
    );

    return {
      id: `ghost-${i}`,
      x: position.x,
      y: position.y,
      width: selectedImage.width,
      height: selectedImage.height,
    };
  });

  return (
    <Group>
      {ghostPlaceholders.map((ghost, index) => (
        <Group key={ghost.id}>
          <Rect
            dash={[8, 4]}
            height={ghost.height}
            listening={false}
            opacity={0.5}
            perfectDrawEnabled={false}
            stroke="#fff"
            strokeWidth={1}
            width={ghost.width}
            x={ghost.x}
            y={ghost.y}
          />
          <Text
            align="center"
            fill="#fff"
            fontSize={12}
            height={ghost.height}
            listening={false}
            opacity={0.8}
            perfectDrawEnabled={false}
            text={(index + 1).toString()}
            verticalAlign="middle"
            width={ghost.width}
            x={ghost.x}
            y={ghost.y}
          />
        </Group>
      ))}
    </Group>
  );
};
