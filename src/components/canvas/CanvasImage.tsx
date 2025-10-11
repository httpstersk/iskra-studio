/**
 * Canvas image component with interaction and animation support
 * 
 * Renders images on the Konva canvas with support for:
 * - Drag and drop with grid snapping
 * - Selection and multi-selection
 * - Streaming image loading
 * - Loading animations
 * - Rotation and transformation
 * 
 * @module components/canvas/CanvasImage
 */

import React, { useRef, useMemo, useCallback } from "react";
import { Image as KonvaImage } from "react-konva";
import Konva from "konva";
import useImage from "use-image";
import { useStreamingImage } from "@/hooks/useStreamingImage";
import { useImageAnimation } from "@/hooks/useImageAnimation";
import { useImageDrag } from "@/hooks/useImageDrag";
import { useImageInteraction } from "@/hooks/useImageInteraction";
import type { PlacedImage } from "@/types/canvas";

/**
 * Props for the CanvasImage component
 */
interface CanvasImageProps {
  /** Map of drag start positions for multi-selection drag */
  dragStartPositions: Map<string, { x: number; y: number }>;
  /** The image to render */
  image: PlacedImage;
  /** Whether any image is currently being dragged */
  isDraggingImage: boolean;
  /** Whether this image is currently selected */
  isSelected: boolean;
  /** Callback to update image properties */
  onChange: (newAttrs: Partial<PlacedImage>) => void;
  /** Callback when drag operation ends */
  onDragEnd: () => void;
  /** Callback when drag operation starts */
  onDragStart: () => void;
  /** Callback when image is selected */
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  /** Optional callback when image is double-clicked */
  onDoubleClick?: (imageId: string) => void;
  /** IDs of all currently selected images */
  selectedIds: string[];
  /** State setter for all images (used in multi-selection) */
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
}

/**
 * Custom hook to get the appropriate image source (streaming or normal).
 * Uses streaming image hook for generated images to show progressive loading,
 * and regular image loading for uploaded images.
 * 
 * @param src - Image source URL
 * @param isGenerated - Whether the image was AI-generated
 * @returns Loaded image element or undefined
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
 * Custom hook to throttle updates to 60fps for optimal performance.
 * Returns a function that checks if enough time has passed since last update.
 * 
 * @param limitMs - Minimum milliseconds between updates (default: 16ms for ~60fps)
 * @returns Function that returns true if update should proceed
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

/**
 * CanvasImage component renders an image on the Konva canvas with full interaction support.
 * 
 * This component integrates multiple hooks to provide a complete image editing experience:
 * - Loading states with pulsing animation
 * - Fade-in animation when loaded
 * - Drag and drop with grid snapping
 * - Multi-selection support
 * - Hover and selection visual feedback
 * - Double-click for variation mode
 * - Mouse button detection
 * 
 * @component
 * @example
 * ```tsx
 * <CanvasImage
 *   image={placedImage}
 *   isSelected={selectedIds.includes(placedImage.id)}
 *   selectedIds={selectedIds}
 *   onChange={(attrs) => updateImage(placedImage.id, attrs)}
 *   onSelect={(e) => handleSelect(placedImage.id, e)}
 *   onDragStart={() => setDragging(true)}
 *   onDragEnd={() => setDragging(false)}
 *   onDoubleClick={(id) => enterVariationMode(id)}
 *   dragStartPositions={dragPosMap}
 *   setImages={setAllImages}
 *   isDraggingImage={isDragging}
 * />
 * ```
 */
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

  // Handle double-click to toggle variation mode
  const handleDoubleClickWrapper = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      if (onDoubleClick) {
        onDoubleClick(image.id);
      }
    },
    [onDoubleClick, image.id]
  );

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
      onDblClick={handleDoubleClickWrapper}
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
      perfectDrawEnabled={false}
      imageSmoothingEnabled={true}
    />
  );
};
