/**
 * Canvas stage renderer component
 * 
 * Main rendering component for the Konva canvas stage. Handles:
 * - Viewport culling for performance optimization
 * - Grid rendering
 * - Selection box visualization
 * - Image and video element rendering
 * - Variation mode ghost placeholders
 * - All mouse and touch interactions
 * 
 * @module components/canvas/CanvasStageRenderer
 */

"use client";

import React, { useMemo } from "react";
import { Stage, Layer } from "react-konva";
import type Konva from "konva";
import { CanvasGrid } from "./CanvasGrid";
import { SelectionBoxComponent } from "./SelectionBox";
import { CanvasImage } from "./CanvasImage";
import { CanvasVideo } from "./CanvasVideo";
import { CANVAS_DIMENSIONS, ARIA_LABELS } from "@/constants/canvas";
import type {
  PlacedImage,
  PlacedVideo,
  SelectionBox,
  GenerationSettings,
} from "@/types/canvas";
import type { Viewport } from "@/hooks/useCanvasState";
import { VariationGhostPlaceholders } from "./VariationGhostPlaceholders";

/**
 * Props for the CanvasStageRenderer component
 */
interface CanvasStageRendererProps {
  canvasSize: { height: number; width: number };
  generationSettings: GenerationSettings;
  hiddenVideoControlsIds: Set<string>;
  images: PlacedImage[];
  interactions: {
    dragStartPositions: Map<string, { x: number; y: number }>;
    handleMouseDown: (e: Konva.KonvaEventObject<MouseEvent>) => void;
    handleMouseMove: (e: Konva.KonvaEventObject<MouseEvent>) => void;
    handleMouseUp: (e: Konva.KonvaEventObject<MouseEvent>) => void;
    handleSelect: (id: string, e: Konva.KonvaEventObject<MouseEvent>) => void;
    handleTouchEnd: (e: Konva.KonvaEventObject<TouchEvent>) => void;
    handleTouchMove: (e: Konva.KonvaEventObject<TouchEvent>) => void;
    handleTouchStart: (e: Konva.KonvaEventObject<TouchEvent>) => void;
    handleWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void;
    isDraggingImage: boolean;
    isPanningCanvas: boolean;
    selectionBox: SelectionBox;
    setDragStartPositions: (
      positions: Map<string, { x: number; y: number }>
    ) => void;
    setIsDraggingImage: (dragging: boolean) => void;
  };
  isCanvasReady: boolean;
  isGenerating: boolean;
  onImageDoubleClick?: (imageId: string) => void;
  saveToHistory: () => void;
  selectedIds: string[];
  setHiddenVideoControlsIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
  setSelectedIds: (ids: string[]) => void;
  setVideos: React.Dispatch<React.SetStateAction<PlacedVideo[]>>;
  showGrid: boolean;
  stageRef: React.RefObject<Konva.Stage | null>;
  videos: PlacedVideo[];
  viewport: Viewport;
  variationMode?: "image" | "video";
  generationCount?: number;
}

/**
 * Filters visible items based on viewport bounds for performance optimization.
 * Only returns items that intersect with the current viewport (plus buffer).
 * This prevents rendering of off-screen elements.
 * 
 * @template T - Type of canvas element (must have position and dimensions)
 * @param items - Array of canvas elements to filter
 * @param viewport - Current viewport state
 * @param canvasSize - Canvas container dimensions
 * @returns Array of elements visible in current viewport
 */
function getVisibleItems<
  T extends { height: number; width: number; x: number; y: number },
>(
  items: T[],
  viewport: Viewport,
  canvasSize: { height: number; width: number }
): T[] {
  const buffer = CANVAS_DIMENSIONS.BUFFER;
  const viewBounds = {
    bottom: (canvasSize.height - viewport.y) / viewport.scale + buffer,
    left: -viewport.x / viewport.scale - buffer,
    right: (canvasSize.width - viewport.x) / viewport.scale + buffer,
    top: -viewport.y / viewport.scale - buffer,
  };

  return items.filter((item) => {
    return !(
      item.x + item.width < viewBounds.left ||
      item.x > viewBounds.right ||
      item.y + item.height < viewBounds.top ||
      item.y > viewBounds.bottom
    );
  });
}

/**
 * CanvasStageRenderer component - Main rendering component for the canvas.
 * 
 * This component manages the Konva Stage and all its child elements, implementing
 * viewport culling for optimal performance. It handles all user interactions
 * including mouse events, touch events, and keyboard shortcuts.
 * 
 * Performance optimizations:
 * - Viewport culling: Only renders visible elements
 * - Memoized visible items calculation
 * - Efficient event delegation
 * 
 * @component
 * @example
 * ```tsx
 * <CanvasStageRenderer
 *   canvasSize={{ width: 1920, height: 1080 }}
 *   viewport={{ x: 0, y: 0, scale: 1.0 }}
 *   images={allImages}
 *   videos={allVideos}
 *   selectedIds={selectedIds}
 *   interactions={interactionHandlers}
 *   stageRef={stageRef}
 *   showGrid={true}
 *   isCanvasReady={true}
 *   // ... other props
 * />
 * ```
 */
export function CanvasStageRenderer({
  canvasSize,
  generationSettings,
  isGenerating,
  hiddenVideoControlsIds,
  images,
  interactions,
  isCanvasReady,
  onImageDoubleClick,
  saveToHistory,
  selectedIds,
  setHiddenVideoControlsIds,
  setImages,
  setSelectedIds,
  setVideos,
  showGrid,
  stageRef,
  videos,
  viewport,
  variationMode,
  generationCount,
}: CanvasStageRendererProps) {
  // Memoize visible items calculation to avoid recalculating on every render
  const visibleImages = useMemo(
    () => getVisibleItems(images, viewport, canvasSize),
    [images, viewport, canvasSize]
  );
  const visibleVideos = useMemo(
    () => getVisibleItems(videos, viewport, canvasSize),
    [videos, viewport, canvasSize]
  );

  // Check if we're in variation mode (one image selected, no prompt)
  const isVariationMode =
    selectedIds.length === 1 &&
    !generationSettings.prompt.trim();
  const selectedImageForVariation = isVariationMode
    ? images.find((img) => img.id === selectedIds[0])
    : null;

  const handleContextMenu = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const point = stage.getPointerPosition();
    if (!point) return;

    const canvasPoint = {
      x: (point.x - viewport.x) / viewport.scale,
      y: (point.y - viewport.y) / viewport.scale,
    };

    const clickedVideo = [...videos].reverse().find((vid) => {
      return (
        canvasPoint.x >= vid.x &&
        canvasPoint.x <= vid.x + vid.width &&
        canvasPoint.y >= vid.y &&
        canvasPoint.y <= vid.y + vid.height
      );
    });

    if (clickedVideo && !selectedIds.includes(clickedVideo.id)) {
      setSelectedIds([clickedVideo.id]);
      return;
    }

    const clickedImage = [...images].reverse().find((img) => {
      return (
        canvasPoint.x >= img.x &&
        canvasPoint.x <= img.x + img.width &&
        canvasPoint.y >= img.y &&
        canvasPoint.y <= img.y + img.height
      );
    });

    if (clickedImage && !selectedIds.includes(clickedImage.id)) {
      setSelectedIds([clickedImage.id]);
    }
  };

  const handleImageDragStart = (imageId: string) => {
    let currentSelectedIds = selectedIds;
    if (!selectedIds.includes(imageId)) {
      currentSelectedIds = [imageId];
      setSelectedIds(currentSelectedIds);
    }
    interactions.setIsDraggingImage(true);
    const positions = new Map<string, { x: number; y: number }>();
    currentSelectedIds.forEach((id) => {
      const img = images.find((i) => i.id === id);
      if (img) positions.set(id, { x: img.x, y: img.y });
    });
    interactions.setDragStartPositions(positions);
  };

  const handleImageDragEnd = () => {
    interactions.setIsDraggingImage(false);
    saveToHistory();
    interactions.setDragStartPositions(new Map());
  };

  const handleVideoDragStart = (videoId: string) => {
    let currentSelectedIds = selectedIds;
    if (!selectedIds.includes(videoId)) {
      currentSelectedIds = [videoId];
      setSelectedIds(currentSelectedIds);
    }
    interactions.setIsDraggingImage(true);
    setHiddenVideoControlsIds((prev) => new Set([...prev, videoId]));
    const positions = new Map<string, { x: number; y: number }>();
    currentSelectedIds.forEach((id) => {
      const vid = videos.find((v) => v.id === id);
      if (vid) positions.set(id, { x: vid.x, y: vid.y });
    });
    interactions.setDragStartPositions(positions);
  };

  const handleVideoDragEnd = (videoId: string) => {
    interactions.setIsDraggingImage(false);
    setHiddenVideoControlsIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(videoId);
      return newSet;
    });
    saveToHistory();
    interactions.setDragStartPositions(new Map());
  };

  if (!isCanvasReady) return null;

  return (
    <>
      <Stage
        aria-label={ARIA_LABELS.STAGE}
        draggable={false}
        height={canvasSize.height}
        onContextMenu={handleContextMenu}
        onMouseDown={interactions.handleMouseDown}
        onMouseLeave={() => {
          // Mouse leave handled in parent
        }}
        onMouseMove={interactions.handleMouseMove}
        onMouseUp={interactions.handleMouseUp}
        onTouchEnd={interactions.handleTouchEnd}
        onTouchMove={interactions.handleTouchMove}
        onTouchStart={interactions.handleTouchStart}
        onWheel={interactions.handleWheel}
        ref={stageRef}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        width={canvasSize.width}
        x={viewport.x}
        y={viewport.y}
      >
        <Layer listening={true}>
          {showGrid && (
            <CanvasGrid canvasSize={canvasSize} viewport={viewport} />
          )}
          <SelectionBoxComponent selectionBox={interactions.selectionBox} />

          {/* Render visible images */}
          {visibleImages.map((image) => (
            <CanvasImage
              dragStartPositions={interactions.dragStartPositions}
              image={image}
              isDraggingImage={interactions.isDraggingImage}
              isSelected={selectedIds.includes(image.id)}
              key={image.id}
              onChange={(newAttrs) => {
                setImages((prev) =>
                  prev.map((img) =>
                    img.id === image.id ? { ...img, ...newAttrs } : img
                  )
                );
              }}
              onDragEnd={handleImageDragEnd}
              onDragStart={() => handleImageDragStart(image.id)}
              onDoubleClick={onImageDoubleClick}
              onSelect={(e) => interactions.handleSelect(image.id, e)}
              selectedIds={selectedIds}
              setImages={setImages}
            />
          ))}

          {/* Ghost placeholders for variation mode */}
          {isVariationMode && selectedImageForVariation && (
            <VariationGhostPlaceholders
              generationCount={generationCount}
              isDragging={interactions.isDraggingImage}
              selectedImage={selectedImageForVariation}
              stageRef={stageRef}
              variationMode={variationMode}
            />
          )}

          {/* Render visible videos */}
          {visibleVideos.map((video) => (
            <CanvasVideo
              dragStartPositions={interactions.dragStartPositions}
              isDraggingVideo={interactions.isDraggingImage}
              isSelected={selectedIds.includes(video.id)}
              key={video.id}
              onChange={(newAttrs) => {
                setVideos((prev) =>
                  prev.map((vid) =>
                    vid.id === video.id ? { ...vid, ...newAttrs } : vid
                  )
                );
              }}
              onDragEnd={() => handleVideoDragEnd(video.id)}
              onDragStart={() => handleVideoDragStart(video.id)}
              onResizeEnd={() =>
                setHiddenVideoControlsIds((prev) => {
                  const newSet = new Set(prev);
                  newSet.delete(video.id);
                  return newSet;
                })
              }
              onResizeStart={() =>
                setHiddenVideoControlsIds(
                  (prev) => new Set([...prev, video.id])
                )
              }
              onSelect={(e) => interactions.handleSelect(video.id, e)}
              selectedIds={selectedIds}
              setVideos={setVideos}
              video={video}
              videos={videos}
            />
          ))}
        </Layer>
      </Stage>
    </>
  );
}
