import React, { useEffect, useRef, useState } from "react";
import { Group, Rect, Image as KonvaImage, Text } from "react-konva";
import Konva from "konva";
import useImage from "use-image";
import type { PlacedImage } from "@/types/canvas";
import { calculateBalancedPosition } from "@/lib/handlers/variation-handler";
import { snapPosition } from "@/utils/snap-utils";
import { createBlurredCloneCanvas } from "@/utils/glsl-blur";

const BLUR_SIGMA = 20;

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
  const [blurredClone, setBlurredClone] = useState<HTMLCanvasElement | null>(
    null
  );
  const [sourceImage] = useImage(selectedImage.src, "anonymous");

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
        nodeRef.current =
          stageRef.current?.findOne(`#${selectedImage.id}`) ?? null;
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
  }, [
    isDragging,
    stageRef,
    selectedImage.id,
    selectedImage.x,
    selectedImage.y,
  ]);

  useEffect(() => {
    if (!sourceImage || selectedImage.width <= 0 || selectedImage.height <= 0) {
      setBlurredClone(null);
      return;
    }

    let cancelled = false;

    const canvas = createBlurredCloneCanvas(
      sourceImage,
      selectedImage.width,
      selectedImage.height,
      BLUR_SIGMA
    );

    if (!cancelled) {
      setBlurredClone(canvas);
    }

    return () => {
      cancelled = true;
    };
  }, [sourceImage, selectedImage.width, selectedImage.height]);

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
      {ghostPlaceholders.map((ghost, i) => (
        <Group key={ghost.id}>
          {blurredClone ? (
            <KonvaImage
              height={ghost.height}
              image={blurredClone}
              listening={false}
              opacity={0.75}
              perfectDrawEnabled={false}
              width={ghost.width}
              x={ghost.x}
              y={ghost.y}
            />
          ) : (
            <Rect
              fill="rgba(15, 23, 42, 0.45)"
              height={ghost.height}
              listening={false}
              perfectDrawEnabled={false}
              width={ghost.width}
              x={ghost.x}
              y={ghost.y}
            />
          )}
          <Rect
            height={ghost.height}
            listening={false}
            opacity={0.25}
            perfectDrawEnabled={false}
            stroke="white"
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
            text={(i + 1).toString()}
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
