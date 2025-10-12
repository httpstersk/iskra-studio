/**
 * Image interaction state management hook
 *
 * Manages hover, selection, and drag interaction states for canvas images.
 * Handles mouse button detection, visual feedback (stroke colors), and
 * auto-selection on drag behavior.
 *
 * @module hooks/useImageInteraction
 */

import type { PlacedImage } from "@/types/canvas";
import type Konva from "konva";
import { useCallback, useMemo, useState } from "react";

/**
 * Props for useImageInteraction hook
 */
interface UseImageInteractionProps {
  /** The image to manage interactions for */
  image: PlacedImage;
  /** Whether the image is currently selected */
  isSelected: boolean;
  /** Callback when image is selected */
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  /** Callback when drag operation starts */
  onDragStart: () => void;
}

/**
 * Return value from useImageInteraction hook
 */
interface UseImageInteractionReturn {
  /** Handler for drag start events */
  handleDragStart: (e: Konva.KonvaEventObject<DragEvent>) => void;
  /** Handler for mouse down events */
  handleMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  /** Handler for mouse enter events (hover start) */
  handleMouseEnter: () => void;
  /** Handler for mouse leave events (hover end) */
  handleMouseLeave: () => void;
  /** Handler for mouse up events */
  handleMouseUp: () => void;
  /** Whether the image can currently be dragged */
  isDraggable: boolean;
  /** Whether the mouse is currently hovering over the image */
  isHovered: boolean;
  /** Current stroke color based on interaction state */
  strokeColor: string;
  /** Current stroke width based on interaction state */
  strokeWidth: number;
}

/**
 * Stroke color constants for different interaction states
 */
const STROKE_COLORS = {
  /** Gray stroke for loading images */
  LOADING: "#6b7280",
  /** Blue stroke for selected images */
  SELECTED: "#3b82f6",
  /** Blue stroke for hovered images */
  HOVERED: "#3b82f6",
  /** Transparent stroke for default state */
  NONE: "transparent",
} as const;

/**
 * Custom hook for managing image interaction states and visual feedback.
 *
 * Features:
 * - Hover state tracking
 * - Mouse button detection (prevents drag on middle/right click)
 * - Auto-selection on drag
 * - Dynamic stroke colors based on state
 * - Loading state visual feedback
 *
 * @param props - Hook configuration
 * @returns Interaction handlers and state values
 *
 * @example
 * ```typescript
 * const {
 *   isDraggable,
 *   strokeColor,
 *   strokeWidth,
 *   handleMouseEnter,
 *   handleMouseLeave,
 *   handleMouseDown,
 *   handleMouseUp,
 *   handleDragStart
 * } = useImageInteraction({
 *   image: placedImage,
 *   isSelected: true,
 *   onSelect: handleSelect,
 *   onDragStart: handleDragStart
 * });
 *
 * <KonvaImage
 *   draggable={isDraggable}
 *   stroke={strokeColor}
 *   strokeWidth={strokeWidth}
 *   onMouseEnter={handleMouseEnter}
 *   onMouseLeave={handleMouseLeave}
 *   onMouseDown={handleMouseDown}
 *   onMouseUp={handleMouseUp}
 *   onDragStart={handleDragStart}
 * />
 * ```
 */
export const useImageInteraction = ({
  image,
  isSelected,
  onDragStart,
  onSelect,
}: UseImageInteractionProps): UseImageInteractionReturn => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDraggable, setIsDraggable] = useState(true);

  // Calculate stroke color based on state
  const strokeColor = useMemo(() => {
    if (image.isLoading) return STROKE_COLORS.LOADING;
    if (isSelected) return STROKE_COLORS.SELECTED;
    if (isHovered) return STROKE_COLORS.HOVERED;
    return STROKE_COLORS.NONE;
  }, [image.isLoading, isSelected, isHovered]);

  // Calculate stroke width based on state
  const strokeWidth = useMemo(() => {
    if (image.isLoading) return 2;
    if (isSelected || isHovered) return 1;
    return 0;
  }, [image.isLoading, isSelected, isHovered]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Only allow dragging with left mouse button (0)
      // Middle mouse (1) and right mouse (2) should not drag images
      const isLeftButton = e.evt.button === 0;
      setIsDraggable(isLeftButton);

      // For middle mouse button, let it bubble up for canvas panning
      if (e.evt.button === 1) {
        return;
      }
    },
    []
  );

  const handleMouseUp = useCallback(() => {
    // Re-enable dragging after mouse up
    setIsDraggable(true);
  }, []);

  const handleDragStart = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      // Stop propagation to prevent stage from being dragged
      e.cancelBubble = true;

      // Auto-select on drag if not already selected
      if (!isSelected) {
        onSelect(e as Konva.KonvaEventObject<MouseEvent>); // Type casting since Konva types are slightly different
      }

      onDragStart();
    },
    [isSelected, onSelect, onDragStart]
  );

  return {
    handleDragStart,
    handleMouseDown,
    handleMouseEnter,
    handleMouseLeave,
    handleMouseUp,
    isDraggable,
    isHovered,
    strokeColor,
    strokeWidth,
  };
};
