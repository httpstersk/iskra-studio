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

import { useImageAnimation } from "@/hooks/useImageAnimation";
import { useImageCache } from "@/hooks/useImageCache";
import { useImageDrag } from "@/hooks/useImageDrag";
import { useImageInteraction } from "@/hooks/useImageInteraction";
import { useStreamingImage } from "@/hooks/useStreamingImage";
import type { PlacedImage } from "@/types/canvas";
import Konva from "konva";
import React, { useCallback, useMemo, useRef } from "react";
import { Image as KonvaImage } from "react-konva";

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
 * Custom hook to get the appropriate image source with thumbnail fallback.
 * 
 * Loading priority:
 * 1. If displayAsThumbnail is true: only load and return thumbnail
 * 2. Otherwise: Thumbnail (if available) displays first, then switches to full-size
 * 3. For generated images, uses streaming for progressive updates
 *
 * @param src - Full-size image source URL
 * @param thumbnailSrc - Optional thumbnail URL (shown first)
 * @param isGenerated - Whether the image was AI-generated
 * @param displayAsThumbnail - If true, only show thumbnail without loading full-size
 * @returns Loaded image element or undefined (thumbnail first, then full-size)
 */
const useCanvasImageSource = (
  src: string,
  thumbnailSrc: string | undefined,
  isGenerated: boolean,
  displayAsThumbnail: boolean
) => {
  // Load thumbnail first if available (shows immediately)
  const [thumbnailImg] = useImageCache(thumbnailSrc || "", "anonymous");

  // If displayAsThumbnail is true, only load thumbnail and skip full-size
  const shouldLoadFullSize = !displayAsThumbnail;

  // Load full-size in parallel (only if not displaying as thumbnail)
  const [streamingImg] = useStreamingImage(isGenerated && shouldLoadFullSize ? src : "");
  const [cachedImg] = useImageCache(!isGenerated && shouldLoadFullSize ? src : "", "anonymous");

  // Full-size image (once loaded, switch from thumbnail)
  const fullSizeImg = useMemo(
    () => (isGenerated ? streamingImg : cachedImg),
    [isGenerated, cachedImg, streamingImg]
  );

  // Priority: 
  // - If displayAsThumbnail: only show thumbnail
  // - Otherwise: full-size image > thumbnail > nothing
  return useMemo(
    () => {
      if (displayAsThumbnail) {
        return thumbnailImg;
      }
      return fullSizeImg || thumbnailImg;
    },
    [displayAsThumbnail, fullSizeImg, thumbnailImg]
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
const CanvasImageComponent: React.FC<CanvasImageProps> = ({
  dragStartPositions,
  image,
  isSelected,
  onChange,
  onDoubleClick,
  onDragEnd,
  onDragStart,
  onSelect,
  selectedIds,
  setImages,
}) => {
  const shapeRef = useRef<Konva.Image>(null);
  const throttleFrame = useFrameThrottle();

  // Get image source (thumbnail first, then full-size)
  const img = useCanvasImageSource(
    image.src,
    image.thumbnailSrc,
    !!image.isGenerated,
    !!image.displayAsThumbnail
  );

  // Handle loading and fade-in animations
  const { displayOpacity } = useImageAnimation({
    isLoading: !!image.isLoading,
    isGenerated: !!image.isGenerated,
    hasImage: !!img,
  });

  // Use explicit opacity if set, otherwise use animation opacity
  const finalOpacity =
    image.opacity !== undefined ? image.opacity : displayOpacity;

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
      draggable={isDraggable}
      height={image.height}
      id={image.id}
      image={img}
      imageSmoothingEnabled={true}
      onClick={onSelect}
      onDblClick={handleDoubleClickWrapper}
      onDragEnd={handleDragEndWrapper}
      onDragMove={handleDragMove}
      onDragStart={handleDragStartInternal}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
      onTap={onSelect}
      opacity={finalOpacity}
      perfectDrawEnabled={false}
      ref={shapeRef}
      rotation={image.rotation}
      stroke={strokeColor}
      shadowForStrokeEnabled={false}
      strokeScaleEnabled={false}
      strokeWidth={strokeWidth}
      width={image.width}
      x={image.x}
      y={image.y}
    />
  );
};

CanvasImageComponent.displayName = "CanvasImage";

export const CanvasImage = React.memo(CanvasImageComponent);
