import React, { useRef, useState, useEffect, useMemo } from "react";
import { Image as KonvaImage } from "react-konva";
import Konva from "konva";
import useImage from "use-image";
import { useStreamingImage } from "@/hooks/useStreamingImage";
import type { PlacedImage } from "@/types/canvas";
import { snapPosition, triggerSnapHaptic } from "@/utils/snap-utils";

interface CanvasImageProps {
  dragStartPositions: Map<string, { x: number; y: number }>;
  image: PlacedImage;
  isDraggingImage: boolean;
  isSelected: boolean;
  onChange: (newAttrs: Partial<PlacedImage>) => void;
  onDragEnd: () => void;
  onDragStart: () => void;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  selectedIds: string[];
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
}

const useCanvasImageSource = (src: string, isGenerated: boolean) => {
  const [streamingImg] = useStreamingImage(isGenerated ? src : "");
  const [normalImg] = useImage(isGenerated ? "" : src, "anonymous");

  return useMemo(
    () => (isGenerated ? streamingImg : normalImg),
    [isGenerated, normalImg, streamingImg]
  );
};

const useFrameThrottle = (limitMs = 16) => {
  const lastRef = useRef(0);

  return () => {
    const now = performance.now();
    if (now - lastRef.current < limitMs) {
      return false;
    }

    lastRef.current = now;
    return true;
  };
};

export const CanvasImage: React.FC<CanvasImageProps> = ({
  image,
  isSelected,
  onSelect,
  onChange,
  onDragStart,
  onDragEnd,
  selectedIds,
  setImages,
  isDraggingImage,
  dragStartPositions,
}) => {
  const shapeRef = useRef<Konva.Image>(null);
  const throttleFrame = useFrameThrottle();
  const img = useCanvasImageSource(image.src, !!image.isGenerated);
  const [isHovered, setIsHovered] = useState(false);
  const [isDraggable, setIsDraggable] = useState(true);
  const [loadingOpacity, setLoadingOpacity] = useState(0.5);
  const lastSnapPos = useRef<{ x: number; y: number } | null>(null);

  // Pulsing animation for loading placeholders
  useEffect(() => {
    if (!image.isLoading) return;

    let animationFrame: number;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const cycle = (elapsed % 2000) / 2000; // 2 second cycle
      const opacity = 0.3 + Math.sin(cycle * Math.PI * 2) * 0.2; // Oscillate between 0.1 and 0.5
      setLoadingOpacity(opacity);
      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [image.isLoading]);

  return (
    <KonvaImage
      ref={shapeRef}
      id={image.id}
      image={img}
      x={image.x}
      y={image.y}
      width={image.width}
      height={image.height}
      rotation={image.rotation}
      draggable={isDraggable}
      onClick={onSelect}
      onTap={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={(e) => {
        // Only allow dragging with left mouse button (0)
        // Middle mouse (1) and right mouse (2) should not drag images
        const isLeftButton = e.evt.button === 0;
        setIsDraggable(isLeftButton);

        // For middle mouse button, don't stop propagation
        // Let it bubble up to the stage for canvas panning
        if (e.evt.button === 1) {
          return;
        }
      }}
      onMouseUp={() => {
        // Re-enable dragging after mouse up
        setIsDraggable(true);
      }}
      onDragStart={(e) => {
        // Stop propagation to prevent stage from being dragged
        e.cancelBubble = true;
        // Auto-select on drag if not already selected
        if (!isSelected) {
          onSelect(e);
        }
        onDragStart();
      }}
      onDragMove={(e) => {
        const node = e.target;
        const nodeX = node.x();
        const nodeY = node.y();

        // Snap to grid
        const snapped = snapPosition(nodeX, nodeY);

        // Always constrain visual position to grid
        node.x(snapped.x);
        node.y(snapped.y);

        // Only update state when snap position actually changes
        const hasPositionChanged =
          !lastSnapPos.current ||
          lastSnapPos.current.x !== snapped.x ||
          lastSnapPos.current.y !== snapped.y;

        if (!hasPositionChanged) {
          return; // Skip state updates if still in same grid cell
        }

        // Throttle state updates only when position changes
        if (!throttleFrame()) {
          return;
        }

        // Trigger haptic feedback on position change
        if (lastSnapPos.current) {
          triggerSnapHaptic();
        }
        lastSnapPos.current = snapped;

        if (selectedIds.includes(image.id) && selectedIds.length > 1) {
          // Multi-selection drag
          const startPos = dragStartPositions.get(image.id);
          if (!startPos) {
            return;
          }

          const deltaX = snapped.x - startPos.x;
          const deltaY = snapped.y - startPos.y;

          // Use functional update to avoid stale closures
          setImages((prevImages) => {
            return prevImages.map((img) => {
              if (img.id === image.id) {
                return { ...img, x: snapped.x, y: snapped.y };
              }

              if (selectedIds.includes(img.id)) {
                const imgStartPos = dragStartPositions.get(img.id);
                if (imgStartPos) {
                  const targetX = imgStartPos.x + deltaX;
                  const targetY = imgStartPos.y + deltaY;
                  const snappedPos = snapPosition(targetX, targetY);

                  return {
                    ...img,
                    x: snappedPos.x,
                    y: snappedPos.y,
                  };
                }
              }

              return img;
            });
          });
        } else {
          // Single item drag
          onChange({
            x: snapped.x,
            y: snapped.y,
          });
        }
      }}
      onDragEnd={(e) => {
        // Reset snap tracking on drag end
        lastSnapPos.current = null;
        onDragEnd();
      }}
      opacity={image.isLoading ? loadingOpacity : image.isGenerated ? 0.9 : 1}
      stroke={
        image.isLoading
          ? "#6b7280"
          : isSelected
            ? "#3b82f6"
            : isHovered
              ? "#3b82f6"
              : "transparent"
      }
      strokeWidth={image.isLoading ? 2 : isSelected || isHovered ? 1 : 0}
    />
  );
};
