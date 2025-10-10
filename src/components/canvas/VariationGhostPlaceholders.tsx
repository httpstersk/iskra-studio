import React from "react";
import { Rect, Group } from "react-konva";
import type { PlacedImage } from "@/types/canvas";
import { calculateBalancedPosition } from "@/lib/handlers/variation-handler";
import { snapPosition } from "@/utils/snap-utils";

interface VariationGhostPlaceholdersProps {
  selectedImage: PlacedImage;
}

/**
 * Renders ghost placeholder outlines showing where variations will be generated
 * Appears when a single image is selected (variation mode)
 */
export const VariationGhostPlaceholders: React.FC<
  VariationGhostPlaceholdersProps
> = ({ selectedImage }) => {
  const sourceCenterX = selectedImage.x + selectedImage.width / 2;
  const sourceCenterY = selectedImage.y + selectedImage.height / 2;

  const ghostPlaceholders = Array.from({ length: 4 }, (_, i) => {
    const position = calculateBalancedPosition(
      sourceCenterX,
      sourceCenterY,
      i,
      selectedImage.width,
      selectedImage.height,
      selectedImage.width,
      selectedImage.height
    );

    // Snap ghost placeholder positions to grid for alignment
    const snapped = snapPosition(position.x, position.y);

    return {
      id: `ghost-${i}`,
      x: snapped.x,
      y: snapped.y,
      width: selectedImage.width,
      height: selectedImage.height,
    };
  });

  return (
    <Group>
      {ghostPlaceholders.map((ghost) => (
        <Rect
          dash={[8, 4]}
          height={ghost.height}
          key={ghost.id}
          listening={false}
          opacity={0.5}
          perfectDrawEnabled={false}
          stroke="#fff"
          strokeWidth={1}
          width={ghost.width}
          x={ghost.x}
          y={ghost.y}
        />
      ))}
    </Group>
  );
};
