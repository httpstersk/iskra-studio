import React, { useRef, useState, useEffect, useMemo } from "react";
import { Image as KonvaImage } from "react-konva";
import Konva from "konva";
import useImage from "use-image";
import { useStreamingImage } from "@/hooks/useStreamingImage";
import type { PlacedImage } from "@/types/canvas";

interface CanvasImageProps {
  image: PlacedImage;
  isSelected: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onChange: (newAttrs: Partial<PlacedImage>) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDoubleClick?: () => void;
  selectedIds: string[];
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
  isDraggingImage: boolean;
  isCroppingImage: boolean;
  dragStartPositions: Map<string, { x: number; y: number }>;
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
  onDoubleClick,
  selectedIds,
  setImages,
  isDraggingImage,
  isCroppingImage,
  dragStartPositions,
}) => {
  const shapeRef = useRef<Konva.Image>(null);
  const throttleFrame = useFrameThrottle();
  const img = useCanvasImageSource(image.src, !!image.isGenerated);
  const [isHovered, setIsHovered] = useState(false);
  const [isDraggable, setIsDraggable] = useState(true);
  const [loadingOpacity, setLoadingOpacity] = useState(0.5);

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
    <>
      <KonvaImage
        ref={shapeRef}
        id={image.id}
        image={img}
        x={image.x}
        y={image.y}
        width={image.width}
        height={image.height}
        rotation={image.rotation}
        crop={
          image.cropX !== undefined && !isCroppingImage
            ? {
                x: (image.cropX || 0) * (img?.naturalWidth || 0),
                y: (image.cropY || 0) * (img?.naturalHeight || 0),
                width: (image.cropWidth || 1) * (img?.naturalWidth || 0),
                height: (image.cropHeight || 1) * (img?.naturalHeight || 0),
              }
            : undefined
        }
        draggable={isDraggable}
        onClick={onSelect}
        onTap={onSelect}
        onDblClick={onDoubleClick}
        onDblTap={onDoubleClick}
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
          if (!throttleFrame()) {
            return;
          }

          const node = e.target;
          const nodeX = node.x();
          const nodeY = node.y();

          if (selectedIds.includes(image.id) && selectedIds.length > 1) {
            // Multi-selection drag
            const startPos = dragStartPositions.get(image.id);
            if (!startPos) {
              return;
            }

            const deltaX = nodeX - startPos.x;
            const deltaY = nodeY - startPos.y;

            // Use functional update to avoid stale closures
            setImages((prevImages) => {
              return prevImages.map((img) => {
                if (img.id === image.id) {
                  return { ...img, x: nodeX, y: nodeY };
                }

                if (selectedIds.includes(img.id)) {
                  const imgStartPos = dragStartPositions.get(img.id);
                  if (imgStartPos) {
                    return {
                      ...img,
                      x: imgStartPos.x + deltaX,
                      y: imgStartPos.y + deltaY,
                    };
                  }
                }

                return img;
              });
            });
          } else {
            // Single item drag
            onChange({
              x: nodeX,
              y: nodeY,
            });
          }
        }}
        onDragEnd={(e) => {
          onDragEnd();
        }}
        opacity={
          image.isLoading ? loadingOpacity : image.isGenerated ? 0.9 : 1
        }
        stroke={
          image.isLoading
            ? "#9ca3af"
            : isSelected
              ? "#3b82f6"
              : isHovered
                ? "#3b82f6"
                : "transparent"
        }
        strokeWidth={image.isLoading ? 3 : isSelected || isHovered ? 2 : 0}
        dash={image.isLoading ? [10, 5] : undefined}
      />
    </>
  );
};
