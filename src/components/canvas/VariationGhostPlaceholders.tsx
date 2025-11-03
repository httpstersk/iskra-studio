import { useImageCache } from "@/hooks/useImageCache";
import { calculateBalancedPosition } from "@/lib/handlers/variation-handler";
import type { PlacedImage } from "@/types/canvas";
import { createBlurredCloneCanvas } from "@/utils/glsl-blur";
import { snapPosition } from "@/utils/snap-utils";
import Konva from "konva";
import React, { useEffect, useRef, useState } from "react";
import { Group, Image as KonvaImage, Rect, Text } from "react-konva";

const BLUR_SIGMA = 20;

interface VariationGhostPlaceholdersProps {
  selectedImage: PlacedImage;
  stageRef: React.RefObject<Konva.Stage | null>;
  isDragging: boolean;
  variationMode?: "image" | "video";
  generationCount?: number;
}

/**
 * Renders ghost placeholder outlines showing where variations will be generated
 * Appears when a single image is selected (variation mode)
 * Shows 4, 8, or 12 placeholders for image mode, 4 for video mode
 * Positioned clockwise starting from top center
 */
export const VariationGhostPlaceholders: React.FC<
  VariationGhostPlaceholdersProps
> = ({
  selectedImage,
  variationMode = "image",
  generationCount = 4,
  stageRef,
  isDragging,
}) => {
  const nodeRef = useRef<Konva.Node | null>(null);
  const [anchor, setAnchor] = useState(() =>
    snapPosition(selectedImage.x, selectedImage.y),
  );
  const [blurredClone, setBlurredClone] = useState<HTMLCanvasElement | null>(
    null,
  );
  const [sourceImage] = useImageCache(selectedImage.src, "anonymous");

  useEffect(() => {
    nodeRef.current = stageRef.current?.findOne(`#${selectedImage.id}`) ?? null;
  }, [stageRef, selectedImage.id]);

  useEffect(() => {
    if (!isDragging) {
      setAnchor(snapPosition(selectedImage.x, selectedImage.y));
      return;
    }

    // Cache the node reference once at the start of dragging
    if (!nodeRef.current) {
      nodeRef.current =
        stageRef.current?.findOne(`#${selectedImage.id}`) ?? null;
    }

    let frameId: number | undefined;
    let lastX = -Infinity;
    let lastY = -Infinity;

    const updatePosition = () => {
      const node = nodeRef.current;
      if (node) {
        const x = node.x();
        const y = node.y();

        // Only snap and update if position actually changed
        if (x !== lastX || y !== lastY) {
          lastX = x;
          lastY = y;
          const snapped = snapPosition(x, y);
          setAnchor((prev) =>
            prev.x === snapped.x && prev.y === snapped.y ? prev : snapped,
          );
        }
      }

      frameId = requestAnimationFrame(updatePosition);
    };

    frameId = requestAnimationFrame(updatePosition);

    return () => {
      if (frameId !== undefined) {
        cancelAnimationFrame(frameId);
      }
      nodeRef.current = null;
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
      BLUR_SIGMA,
    );

    if (!cancelled) {
      setBlurredClone(canvas);
    }

    return () => {
      cancelled = true;
    };
  }, [sourceImage, selectedImage.width, selectedImage.height]);

  // Determine position indices based on generation count
  // 4 variations: indices 0, 2, 4, 6 (top, right, bottom, left - cardinal directions)
  // 8 variations: all indices 0-7 (sides + corners)
  // 12 variations: indices 0-7 (inner ring) + 8-11 (outer cardinal directions)
  let positionIndices: number[];

  if (generationCount === 4) {
    positionIndices = [0, 2, 4, 6];
  } else if (generationCount === 8) {
    positionIndices = [0, 1, 2, 3, 4, 5, 6, 7];
  } else {
    // 12 variations: 8 inner positions + 4 outer cardinal directions
    positionIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  }

  const ghostPlaceholders = positionIndices.map((positionIndex, i) => {
    // Calculate position based on snapped source position
    const position = calculateBalancedPosition(
      anchor.x,
      anchor.y,
      positionIndex,
      selectedImage.width,
      selectedImage.height,
      selectedImage.width,
      selectedImage.height,
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
    <Group listening={false}>
      {ghostPlaceholders.map((ghost, i) => (
        <Group key={ghost.id} listening={false}>
          {blurredClone ? (
            <KonvaImage
              height={ghost.height}
              image={blurredClone}
              listening={false}
              opacity={0.75}
              perfectDrawEnabled={false}
              shadowForStrokeEnabled={false}
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
              shadowForStrokeEnabled={false}
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
            shadowForStrokeEnabled={false}
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
            shadowForStrokeEnabled={false}
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
