import React, { useEffect, useMemo, useRef, useState } from "react";
import { Group, Rect, Text } from "react-konva";
import Konva from "konva";
import type { PlacedImage } from "@/types/canvas";
import { calculateBalancedPosition } from "@/lib/handlers/variation-handler";
import { snapPosition } from "@/utils/snap-utils";

interface VariationGhostPlaceholdersProps {
  selectedImage: PlacedImage;
  stageRef: React.RefObject<Konva.Stage>;
  isDragging: boolean;
  variationMode?: "image" | "video";
}

/**
 * Renders ghost placeholder outlines showing where variations will be generated
 * Appears when a single image is selected (variation mode)
 * Shows 8 placeholders for image mode, 4 for video mode
 * Positioned clockwise starting from top center
 */
export const VariationGhostPlaceholders: React.FC<
  VariationGhostPlaceholdersProps
> = ({ selectedImage, variationMode = "image", stageRef, isDragging }) => {
  const nodeRef = useRef<Konva.Node | null>(null);
  const [anchor, setAnchor] = useState(() =>
    snapPosition(selectedImage.x, selectedImage.y)
  );

  useEffect(() => {
    nodeRef.current = stageRef.current?.findOne(`#${selectedImage.id}`) ?? null;
  }, [stageRef, selectedImage.id]);

  useEffect(() => {
    if (!isDragging) {
      setAnchor(snapPosition(selectedImage.x, selectedImage.y));
      return;
    }

    let frameId: number | undefined;

    const updatePosition = () => {
      if (!nodeRef.current) {
        nodeRef.current = stageRef.current?.findOne(`#${selectedImage.id}`) ?? null;
      }

      const node = nodeRef.current;
      if (node) {
        const snapped = snapPosition(node.x(), node.y());
        setAnchor((prev) =>
          prev.x === snapped.x && prev.y === snapped.y ? prev : snapped
        );
      }

      frameId = requestAnimationFrame(updatePosition);
    };

    updatePosition();

    return () => {
      if (frameId !== undefined) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [isDragging, stageRef, selectedImage.id, selectedImage.x, selectedImage.y]);

  // For video mode, use position indices 0, 2, 4, 6 (top, right, bottom, left - clockwise from top)
  const positionIndices =
    variationMode === "image" ? [0, 1, 2, 3, 4, 5, 6, 7] : [0, 2, 4, 6];

  const ghostPlaceholders = positionIndices.map((positionIndex, i) => {
    // Calculate position based on snapped source position
    const position = calculateBalancedPosition(
      anchor.x,
      anchor.y,
      positionIndex,
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
            dash={[4, 4]}
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
