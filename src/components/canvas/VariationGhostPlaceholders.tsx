import React from "react";
import { Rect, Group } from "react-konva";
import type { PlacedImage } from "@/types/canvas";
import { calculateBalancedPosition } from "@/lib/handlers/variation-handler";

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
  // Calculate source image center
  const sourceCenterX = selectedImage.x + selectedImage.width / 2;
  const sourceCenterY = selectedImage.y + selectedImage.height / 2;

  // Calculate radius for circular placement
  const diagonal = Math.sqrt(
    selectedImage.width ** 2 + selectedImage.height ** 2
  );
  const radius = diagonal * 1.2;

  // Generate 12 ghost placeholder positions
  const ghostPlaceholders = Array.from({ length: 12 }, (_, i) => {
    const { x, y } = calculateBalancedPosition(
      sourceCenterX,
      sourceCenterY,
      radius,
      i,
      selectedImage.width,
      selectedImage.height
    );

    return {
      id: `ghost-${i}`,
      x,
      y,
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
