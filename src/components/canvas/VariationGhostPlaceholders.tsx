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
}

/**
 * Renders ghost placeholder outlines showing where variations will be generated
 * Appears when a single image is selected (variation mode)
 */
export const VariationGhostPlaceholders: React.FC<
  VariationGhostPlaceholdersProps
> = ({ selectedImage, stageRef, isDragging }) => {
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

  const ghostPlaceholders = useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => {
      const position = calculateBalancedPosition(
        anchor.x,
        anchor.y,
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
  }, [anchor.x, anchor.y, selectedImage.height, selectedImage.width]);

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
