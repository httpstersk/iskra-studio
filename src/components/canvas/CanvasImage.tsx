import React, { useRef, useMemo, useCallback } from "react";
import { Image as KonvaImage } from "react-konva";
import Konva from "konva";
import useImage from "use-image";
import { useStreamingImage } from "@/hooks/useStreamingImage";
import { useImageAnimation } from "@/hooks/useImageAnimation";
import { useImageDrag } from "@/hooks/useImageDrag";
import { useImageInteraction } from "@/hooks/useImageInteraction";
import type { PlacedImage } from "@/types/canvas";

interface CanvasImageProps {
  dragStartPositions: Map<string, { x: number; y: number }>;
  image: PlacedImage;
  isCroppingImage: boolean;
  isDraggingImage: boolean;
  isSelected: boolean;
  onChange: (newAttrs: Partial<PlacedImage>) => void;
  onDoubleClick?: () => void;
  onDragEnd: () => void;
  onDragStart: () => void;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  selectedIds: string[];
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
}

/**
 * Hook to get the appropriate image source (streaming or normal)
 */
const useCanvasImageSource = (src: string, isGenerated: boolean) => {
  const [streamingImg] = useStreamingImage(isGenerated ? src : "");
  const [normalImg] = useImage(isGenerated ? "" : src, "anonymous");

  return useMemo(
    () => (isGenerated ? streamingImg : normalImg),
    [isGenerated, normalImg, streamingImg]
  );
};

/**
 * Hook to throttle updates to 60fps
 */
const useFrameThrottle = (limitMs = 16) => {
  const lastRef = useRef(0);

  return useCallback(() => {
    const now = performance.now();
    if (now - lastRef.current < limitMs) {
      return false;
    }
    lastRef.current = now;
    return true;
  }, [limitMs]);
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

  // Get image source (streaming or normal)
  const img = useCanvasImageSource(image.src, !!image.isGenerated);

  // Handle loading and fade-in animations
  const { displayOpacity } = useImageAnimation({
    isLoading: !!image.isLoading,
    isGenerated: !!image.isGenerated,
    hasImage: !!img,
  });

  // Handle drag behavior
  const { handleDragMove, handleDragEnd: handleDragEndInternal } = useImageDrag(
    {
      image,
      selectedIds,
      dragStartPositions,
      onChange,
      setImages,
      throttleFrame,
    }
  );

  // Handle interaction states
  const {
    isHovered,
    isDraggable,
    strokeColor,
    strokeWidth,
    handleMouseEnter,
    handleMouseLeave,
    handleMouseDown,
    handleMouseUp,
    handleDragStart: handleDragStartInternal,
  } = useImageInteraction({
    image,
    isSelected,
    isCroppingImage,
    onSelect,
    onDragStart,
  });

  // Wrap drag end to call both internal and external handlers
  const handleDragEndWrapper = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      handleDragEndInternal();
      onDragEnd();
    },
    [handleDragEndInternal, onDragEnd]
  );

  // Memoize crop calculation for performance
  const cropConfig = useMemo(() => {
    if (image.cropX === undefined || isCroppingImage || !img) {
      return undefined;
    }
    return {
      x: (image.cropX || 0) * (img.naturalWidth || 0),
      y: (image.cropY || 0) * (img.naturalHeight || 0),
      width: (image.cropWidth || 1) * (img.naturalWidth || 0),
      height: (image.cropHeight || 1) * (img.naturalHeight || 0),
    };
  }, [
    image.cropX,
    image.cropY,
    image.cropWidth,
    image.cropHeight,
    isCroppingImage,
    img,
  ]);

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
      crop={cropConfig}
      draggable={isDraggable}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={onDoubleClick}
      onDblTap={onDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onDragStart={handleDragStartInternal}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEndWrapper}
      opacity={displayOpacity}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
    />
  );
};
