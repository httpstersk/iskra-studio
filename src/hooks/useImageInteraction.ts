import { useState, useCallback, useMemo } from "react";
import type Konva from "konva";
import type { PlacedImage } from "@/types/canvas";

interface UseImageInteractionProps {
  image: PlacedImage;
  isSelected: boolean;
  isCroppingImage: boolean;
  onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onDragStart: () => void;
}

interface UseImageInteractionReturn {
  handleDragStart: (e: Konva.KonvaEventObject<DragEvent>) => void;
  handleMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  handleMouseUp: () => void;
  isDraggable: boolean;
  isHovered: boolean;
  strokeColor: string;
  strokeWidth: number;
}

/**
 * Stroke color constants
 */
const STROKE_COLORS = {
  LOADING: "#6b7280",
  SELECTED: "#3b82f6",
  HOVERED: "#3b82f6",
  NONE: "transparent",
} as const;

/**
 * Custom hook for image interaction states (hover, drag, selection)
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
        onSelect(e as any); // Type casting since Konva types are slightly different
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
