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

import { DirectiveLabel } from "@/components/canvas/DirectiveLabel";
import { useAnimationCoordinator } from "@/hooks/useAnimationCoordinator";
import { useImageDrag } from "@/hooks/useImageDrag";
import { useImageInteraction } from "@/hooks/useImageInteraction";
import { useSharedSkeletonAnimation } from "@/hooks/useSharedSkeletonAnimation";
import type { PlacedImage } from "@/types/canvas";
import { abbreviateCameraDirective } from "@/utils/camera-abbreviation-utils";
import { extractShortErrorMessage } from "@/utils/error-message-utils";
import Konva from "konva";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Group, Image as KonvaImage, Rect } from "react-konva";
import {
  useCanvasImageSource,
  useFrameThrottle,
  usePixelatedOverlay,
} from "./canvas-image-hooks";

/**
 * Props for the CanvasImage component
 */
interface CanvasImageProps {
  /** Map of drag start positions for multi-selection drag */
  dragStartPositions: Map<string, { x: number; y: number }>;
  /** The image to render */
  image: PlacedImage;
  /** All images on canvas (for sibling snapping) */
  images: PlacedImage[];
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
  /** Setter for snap lines visualization */
  setSnapLines: (lines: import("@/types/canvas").SnapLine[]) => void;
}

/**
 * Helper function to get common dimension/position props.
 * Used across all KonvaImage instances and DirectiveLabels.
 *
 * @param image - The placed image
 * @returns Object with position and dimension props
 */
const getImageDimensions = (image: PlacedImage) => ({
  height: image.height,
  width: image.width,
  x: image.x,
  y: image.y,
});

/**
 * Helper function to get the directive label text for an image.
 * Priority: storylineLabel > emotion > characterVariation > directorName > cameraAngle > lightingScenario
 *
 * @param image - The placed image
 * @returns Label text or undefined if no label should be shown
 */
const getDirectiveLabelText = (image: PlacedImage): string | undefined => {
  if (image.isLoading) return undefined;
  // Storyline time labels (e.g., "+1min", "+2h5m")
  if (image.storylineLabel) return image.storylineLabel;
  // Emotion labels (e.g., "Joy", "Sadness")
  if (image.emotion) return image.emotion;
  // Character variation labels
  if (image.characterVariation) return image.characterVariation;
  // Director name labels
  if (image.directorName) return image.directorName;
  // Camera angle labels (abbreviated)
  if (image.cameraAngle) return abbreviateCameraDirective(image.cameraAngle);
  // Lighting scenario labels
  if (image.lightingScenario) return image.lightingScenario;
  return undefined;
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
  images,
  isSelected,
  onChange,
  onDoubleClick,
  onDragEnd,
  onDragStart,
  onSelect,
  selectedIds,
  setImages,
  setSnapLines,
}) => {
  const shapeRef = useRef<Konva.Image>(null);
  const throttleFrame = useFrameThrottle();

  // Skeleton shimmer animation - uses shared coordinator for performance
  const shimmerOpacity = useSharedSkeletonAnimation(!!image.isSkeleton);

  // Get image source (thumbnail first, then full-size)
  // Skip loading for error placeholders and skeletons to save resources
  const img = useCanvasImageSource(
    image.hasContentError || image.isSkeleton ? "" : image.src,
    image.thumbnailSrc,
    !!image.isGenerated,
    !!image.displayAsThumbnail
  );

  // Get pixelated overlay if available (skip for skeletons)
  const pixelatedImg = usePixelatedOverlay(
    image.isSkeleton ? undefined : image.pixelatedSrc
  );

  // Unified animation coordinator for all animations
  const {
    displayOpacity,
    isTransitionComplete,
    pixelatedOpacity: animatedPixelatedOpacity,
    referenceOpacity: animatedReferenceOpacity,
  } = useAnimationCoordinator({
    hasImage: !!img,
    hasPixelated: !!pixelatedImg,
    isGenerated: !!image.isGenerated,
    isLoading: !!image.isLoading,
  });

  // Use explicit opacity if set, otherwise use animation opacity
  const finalOpacity =
    image.opacity !== undefined ? image.opacity : displayOpacity;

  // Calculate final opacities with transition
  // When custom opacity is set, scale the animated opacities proportionally
  const opacityScale = displayOpacity > 0 ? finalOpacity / displayOpacity : 1;
  const referenceOpacity = pixelatedImg
    ? opacityScale * animatedReferenceOpacity
    : finalOpacity;
  const overlayOpacity = opacityScale * animatedPixelatedOpacity;

  // Clear pixelatedSrc after transition completes to free memory
  // EXCEPTION: Keep pixelated overlay for error placeholders (hasContentError: true)
  useEffect(() => {
    if (
      isTransitionComplete &&
      image.pixelatedSrc &&
      !image.isLoading &&
      !image.hasContentError
    ) {
      onChange({
        pixelatedSrc: undefined,
      });
    }
  }, [
    isTransitionComplete,
    image.pixelatedSrc,
    image.isLoading,
    image.hasContentError,
    onChange,
    image.id,
  ]);

  // Handle drag behavior
  const { handleDragMove, handleDragEnd: handleDragEndInternal } = useImageDrag(
    {
      image,
      images,
      selectedIds,
      dragStartPositions,
      onChange,
      setImages,
      setSnapLines,
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
    (_e: Konva.KonvaEventObject<DragEvent>) => {
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

  // Common props shared across all KonvaImage instances
  const commonImageProps = useMemo(
    () => ({
      ...getImageDimensions(image),
      draggable: isDraggable,
      id: image.id,
      onClick: onSelect,
      onDblClick: handleDoubleClickWrapper,
      onDragEnd: handleDragEndWrapper,
      onDragMove: handleDragMove,
      onDragStart: handleDragStartInternal,
      onMouseDown: handleMouseDown,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onMouseUp: handleMouseUp,
      onTap: onSelect,
      perfectDrawEnabled: false,
      ref: shapeRef,
      rotation: image.rotation,
      shadowForStrokeEnabled: false,
      stroke: strokeColor,
      strokeScaleEnabled: false,
      strokeWidth: strokeWidth,
    }),
    [
      image,
      isDraggable,
      onSelect,
      handleDoubleClickWrapper,
      handleDragEndWrapper,
      handleDragMove,
      handleDragStartInternal,
      handleMouseDown,
      handleMouseEnter,
      handleMouseLeave,
      handleMouseUp,
      strokeColor,
      strokeWidth,
    ]
  );

  // Get directive label text if applicable
  const directiveLabelText = getDirectiveLabelText(image);

  // Skeleton placeholder rendering - shows before real image loads
  if (image.isSkeleton) {
    return (
      <Group listening={false}>
        {/* Base skeleton rectangle */}
        <Rect
          {...getImageDimensions(image)}
          fill="#1a1a1a"
          opacity={0.5}
          rotation={image.rotation}
          listening={false}
          perfectDrawEnabled={false}
        />
        {/* Shimmer overlay for animation */}
        <Rect
          {...getImageDimensions(image)}
          fill="#2a2a2a"
          opacity={shimmerOpacity}
          rotation={image.rotation}
          listening={false}
          perfectDrawEnabled={false}
        />
      </Group>
    );
  }

  // Special case: Error placeholders show only pixelated overlay
  // No animation, no transition, just the static error state
  if (image.hasContentError && pixelatedImg) {
    return (
      <>
        <KonvaImage
          {...commonImageProps}
          image={pixelatedImg}
          imageSmoothingEnabled={false}
          opacity={image.opacity ?? 1.0}
        />
        {/* Display error message label on error placeholders */}
        <DirectiveLabel
          {...getImageDimensions(image)}
          labelText={extractShortErrorMessage(image.errorMessage)}
        />
      </>
    );
  }

  // If pixelated overlay exists and hasn't fully transitioned, render both layers
  // Only enter dual-layer mode if both images are available to prevent gaps
  if (pixelatedImg && !isTransitionComplete && img) {
    return (
      <>
        {/* Reference image - fades from 0.4 to 1.0 opacity during transition */}
        <KonvaImage
          {...getImageDimensions(image)}
          draggable={false}
          id={`${image.id}-reference`}
          image={img}
          imageSmoothingEnabled={true}
          listening={false}
          opacity={referenceOpacity}
          perfectDrawEnabled={false}
          rotation={image.rotation}
          shadowForStrokeEnabled={false}
        />

        {/* Pixelated overlay - fades from 1.0 to 0.0 opacity during transition */}
        <KonvaImage
          {...commonImageProps}
          image={pixelatedImg}
          imageSmoothingEnabled={false}
          opacity={overlayOpacity}
        />
      </>
    );
  }

  // If pixelated overlay exists but reference image hasn't loaded yet, show only pixelated
  if (pixelatedImg && !img) {
    return (
      <KonvaImage
        {...commonImageProps}
        image={pixelatedImg}
        imageSmoothingEnabled={false}
        opacity={finalOpacity}
      />
    );
  }

  // Default rendering without pixelated overlay
  return (
    <>
      <KonvaImage
        {...commonImageProps}
        image={img}
        imageSmoothingEnabled={true}
        opacity={finalOpacity}
      />

      {directiveLabelText && (
        <DirectiveLabel
          {...getImageDimensions(image)}
          labelText={directiveLabelText}
        />
      )}
    </>
  );
};

CanvasImageComponent.displayName = "CanvasImage";

/**
 * Custom comparison function for React.memo to prevent unnecessary rerenders.
 * Properly compares Map props and other complex objects.
 *
 * @param prevProps - Previous props
 * @param nextProps - Next props
 * @returns true if props are equal (skip rerender), false otherwise
 */
const arePropsEqual = (
  prevProps: CanvasImageProps,
  nextProps: CanvasImageProps
): boolean => {
  // Check primitive props
  if (
    prevProps.isSelected !== nextProps.isSelected ||
    prevProps.isDraggingImage !== nextProps.isDraggingImage
  ) {
    return false;
  }

  // Check image object - compare key properties that affect rendering
  const prevImg = prevProps.image;
  const nextImg = nextProps.image;
  if (
    prevImg.id !== nextImg.id ||
    prevImg.src !== nextImg.src ||
    prevImg.thumbnailSrc !== nextImg.thumbnailSrc ||
    prevImg.pixelatedSrc !== nextImg.pixelatedSrc ||
    prevImg.x !== nextImg.x ||
    prevImg.y !== nextImg.y ||
    prevImg.width !== nextImg.width ||
    prevImg.height !== nextImg.height ||
    prevImg.rotation !== nextImg.rotation ||
    prevImg.opacity !== nextImg.opacity ||
    prevImg.isLoading !== nextImg.isLoading ||
    prevImg.isGenerated !== nextImg.isGenerated ||
    prevImg.isSkeleton !== nextImg.isSkeleton ||
    prevImg.displayAsThumbnail !== nextImg.displayAsThumbnail ||
    prevImg.cameraAngle !== nextImg.cameraAngle ||
    prevImg.directorName !== nextImg.directorName ||
    prevImg.isDirector !== nextImg.isDirector ||
    prevImg.hasContentError !== nextImg.hasContentError ||
    prevImg.errorMessage !== nextImg.errorMessage ||
    // Variation label fields (matching Convex schema)
    prevImg.emotion !== nextImg.emotion ||
    prevImg.characterVariation !== nextImg.characterVariation ||
    prevImg.storylineLabel !== nextImg.storylineLabel ||
    prevImg.lightingScenario !== nextImg.lightingScenario ||
    prevImg.variationType !== nextImg.variationType
  ) {
    return false;
  }

  // Check selectedIds array
  if (prevProps.selectedIds.length !== nextProps.selectedIds.length) {
    return false;
  }

  for (let i = 0; i < prevProps.selectedIds.length; i++) {
    if (prevProps.selectedIds[i] !== nextProps.selectedIds[i]) {
      return false;
    }
  }

  // Check dragStartPositions Map
  if (prevProps.dragStartPositions.size !== nextProps.dragStartPositions.size) {
    return false;
  }

  for (const [key, value] of prevProps.dragStartPositions) {
    const nextValue = nextProps.dragStartPositions.get(key);
    if (!nextValue || nextValue.x !== value.x || nextValue.y !== value.y) {
      return false;
    }
  }

  // Callbacks are assumed stable (should be wrapped in useCallback by parent)
  // If they change reference, we still rerender to be safe
  if (
    prevProps.onChange !== nextProps.onChange ||
    prevProps.onDragEnd !== nextProps.onDragEnd ||
    prevProps.onDragStart !== nextProps.onDragStart ||
    prevProps.onSelect !== nextProps.onSelect ||
    prevProps.onDoubleClick !== nextProps.onDoubleClick ||
    prevProps.setImages !== nextProps.setImages ||
    prevProps.setSnapLines !== nextProps.setSnapLines ||
    prevProps.images !== nextProps.images
  ) {
    return false;
  }

  return true;
};

export const CanvasImage = React.memo(CanvasImageComponent, arePropsEqual);
