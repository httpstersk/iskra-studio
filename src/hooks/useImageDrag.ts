/**
 * Image drag behavior hook
 *
 * Provides optimized drag handling for canvas images with grid snapping,
 * haptic feedback, and multi-selection support. Implements throttling
 * to prevent excessive state updates during drag operations.
 *
 * @module hooks/useImageDrag
 */

import { useRef, useCallback } from "react";
import type Konva from "konva";
import type { PlacedImage } from "@/types/canvas";
import { snapPosition, triggerSnapHaptic } from "@/utils/snap-utils";

/**
 * Props for useImageDrag hook
 */
interface UseImageDragProps {
  /** The image being dragged */
  image: PlacedImage;
  /** IDs of all currently selected images */
  selectedIds: string[];
  /** Map of image IDs to their positions at drag start */
  dragStartPositions: Map<string, { x: number; y: number }>;
  /** Callback to update a single image's properties */
  onChange: (newAttrs: Partial<PlacedImage>) => void;
  /** State setter for all images (used in multi-selection) */
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
  /** Throttle function that returns true if update should proceed */
  throttleFrame: () => boolean;
}

/**
 * Return value from useImageDrag hook
 */
interface UseImageDragReturn {
  /** Handler for drag move events */
  handleDragMove: (e: Konva.KonvaEventObject<DragEvent>) => void;
  /** Handler for drag end events */
  handleDragEnd: () => void;
}

/**
 * Custom hook for optimized image dragging with grid snapping and multi-selection support.
 *
 * Features:
 * - Automatic grid snapping with configurable grid size
 * - Haptic feedback on snap position changes
 * - Single and multi-selection drag support
 * - Throttled state updates to prevent performance issues
 * - Synchronized movement of all selected images
 *
 * @param props - Hook configuration
 * @returns Drag event handlers
 *
 * @example
 * ```typescript
 * const { handleDragMove, handleDragEnd } = useImageDrag({
 *   image: placedImage,
 *   selectedIds: ['img1', 'img2'],
 *   dragStartPositions: dragPosMap,
 *   onChange: updateImage,
 *   setImages: setAllImages,
 *   throttleFrame: () => true
 * });
 *
 * <KonvaImage
 *   onDragMove={handleDragMove}
 *   onDragEnd={handleDragEnd}
 * />
 * ```
 */
export const useImageDrag = ({
  image,
  selectedIds,
  dragStartPositions,
  onChange,
  setImages,
  throttleFrame,
}: UseImageDragProps): UseImageDragReturn => {
  const lastSnapPos = useRef<{ x: number; y: number } | null>(null);

  const handleDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
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

      // Handle multi-selection vs single-selection drag
      const isMultiDrag =
        selectedIds.includes(image.id) && selectedIds.length > 1;

      if (isMultiDrag) {
        // Multi-selection drag: move all selected items together
        const startPos = dragStartPositions.get(image.id);
        if (!startPos) return;

        const deltaX = snapped.x - startPos.x;
        const deltaY = snapped.y - startPos.y;

        setImages((prevImages) => {
          return prevImages.map((img) => {
            // Update the dragged image
            if (img.id === image.id) {
              return { ...img, x: snapped.x, y: snapped.y };
            }

            // Update other selected images by delta
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
        // Single item drag: simpler update
        onChange({
          x: snapped.x,
          y: snapped.y,
        });
      }
    },
    [
      image.id,
      selectedIds,
      dragStartPositions,
      onChange,
      setImages,
      throttleFrame,
    ],
  );

  const handleDragEnd = useCallback(() => {
    // Reset snap tracking on drag end
    lastSnapPos.current = null;
  }, []);

  return {
    handleDragMove,
    handleDragEnd,
  };
};
