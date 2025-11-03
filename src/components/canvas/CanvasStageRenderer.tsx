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

import { ARIA_LABELS, CANVAS_DIMENSIONS } from "@/constants/canvas";
import type { Viewport } from "@/hooks/useCanvasState";
import type {
  GenerationSettings,
  PlacedImage,
  PlacedVideo,
  SelectionBox,
} from "@/types/canvas";
import type Konva from "konva";
import React, { useCallback, useMemo } from "react";
import { Layer, Stage } from "react-konva";
import { CanvasGrid } from "./CanvasGrid";
import { CanvasImage } from "./CanvasImage";
import { CanvasVideo } from "./CanvasVideo";
import { SelectionBoxComponent } from "./SelectionBox";
import { VariationGhostPlaceholders } from "./VariationGhostPlaceholders";

/**
 * Props for the CanvasStageRenderer component
 */
interface CanvasStageRendererProps {
  canvasSize: { height: number; width: number };
  generationCount?: number;
  generationSettings: GenerationSettings;
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
      positions: Map<string, { x: number; y: number }>,
    ) => void;
    setIsDraggingImage: (dragging: boolean) => void;
  };
  isCanvasReady: boolean;
  isGenerating: boolean;
  onImageDoubleClick?: (imageId: string) => void;
  saveToHistory: () => void;
  selectedIds: string[];
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
  setSelectedIds: (ids: string[]) => void;
  setVideos: React.Dispatch<React.SetStateAction<PlacedVideo[]>>;
  showGrid: boolean;
  stageRef: React.RefObject<Konva.Stage | null>;
  variationMode?: "image" | "video";
  videos: PlacedVideo[];
  viewport: Viewport;
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
  canvasSize: { height: number; width: number },
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
 * - React.memo to prevent unnecessary rerenders
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
export const CanvasStageRenderer = React.memo(function CanvasStageRenderer({
  canvasSize,
  generationCount,
  images,
  interactions,
  isCanvasReady,
  onImageDoubleClick,
  saveToHistory,
  selectedIds,
  setImages,
  setSelectedIds,
  setVideos,
  showGrid,
  stageRef,
  variationMode,
  videos,
  viewport,
}: CanvasStageRendererProps) {
  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  /**
   * Handles right-click context menu on canvas elements
   * Selects the topmost element under cursor for context operations
   */
  const handleContextMenu = React.useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();
      if (!stage) return;
      const point = stage.getPointerPosition();
      if (!point) return;

      const canvasPoint = {
        x: (point.x - viewport.x) / viewport.scale,
        y: (point.y - viewport.y) / viewport.scale,
      };

      // Find clicked video by iterating in reverse without array copy
      let clickedVideo: PlacedVideo | null = null;

      for (let i = videos.length - 1; i >= 0; i--) {
        const vid = videos[i];
        if (
          canvasPoint.x >= vid.x &&
          canvasPoint.x <= vid.x + vid.width &&
          canvasPoint.y >= vid.y &&
          canvasPoint.y <= vid.y + vid.height
        ) {
          clickedVideo = vid;
          break;
        }
      }

      if (clickedVideo && !selectedIdsSet.has(clickedVideo.id)) {
        setSelectedIds([clickedVideo.id]);
        return;
      }

      // Find clicked image by iterating in reverse without array copy
      let clickedImage: PlacedImage | null = null;

      for (let i = images.length - 1; i >= 0; i--) {
        const img = images[i];
        if (
          canvasPoint.x >= img.x &&
          canvasPoint.x <= img.x + img.width &&
          canvasPoint.y >= img.y &&
          canvasPoint.y <= img.y + img.height
        ) {
          clickedImage = img;
          break;
        }
      }

      if (clickedImage && !selectedIdsSet.has(clickedImage.id)) {
        setSelectedIds([clickedImage.id]);
      }
    },
    [images, selectedIdsSet, setSelectedIds, videos, viewport],
  );

  /**
   * Creates optimized onChange handler for image property updates
   * Memoized to prevent function recreation on each render
   */
  const handleImageChange = useCallback(
    (imageId: string) => (newAttrs: Partial<PlacedImage>) => {
      setImages((prev) =>
        prev.map((img) => (img.id === imageId ? { ...img, ...newAttrs } : img)),
      );
    },
    [setImages],
  );

  /**
   * Handles end of image drag operation
   * Saves canvas state to history for undo/redo
   */
  const handleImageDragEnd = React.useCallback(() => {
    interactions.setIsDraggingImage(false);
    saveToHistory();
    interactions.setDragStartPositions(new Map());
  }, [interactions, saveToHistory]);

  /**
   * Handles start of image drag operation
   * Ensures dragged image is selected and stores initial positions for multi-drag
   */
  const handleImageDragStart = React.useCallback(
    (imageId: string) => {
      let currentSelectedIds = selectedIds;
      if (!selectedIdsSet.has(imageId)) {
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
    },
    [images, interactions, selectedIdsSet, selectedIds, setSelectedIds],
  );

  /**
   * Creates optimized onChange handler for video property updates
   * Memoized to prevent function recreation on each render
   */
  const handleVideoChange = useCallback(
    (videoId: string) => (newAttrs: Partial<PlacedVideo>) => {
      setVideos((prev) =>
        prev.map((vid) => (vid.id === videoId ? { ...vid, ...newAttrs } : vid)),
      );
    },
    [setVideos],
  );

  /**
   * Handles end of video drag operation
   * Saves canvas state
   */
  const handleVideoDragEnd = React.useCallback(
    (videoId: string) => {
      interactions.setIsDraggingImage(false);
      saveToHistory();
      interactions.setDragStartPositions(new Map());
    },
    [interactions, saveToHistory],
  );

  /**
   * Handles start of video drag operation
   * Ensures dragged video is selected
   */
  const handleVideoDragStart = React.useCallback(
    (videoId: string) => {
      let currentSelectedIds = selectedIds;
      if (!selectedIdsSet.has(videoId)) {
        currentSelectedIds = [videoId];
        setSelectedIds(currentSelectedIds);
      }
      interactions.setIsDraggingImage(true);
      const positions = new Map<string, { x: number; y: number }>();
      currentSelectedIds.forEach((id) => {
        const vid = videos.find((v) => v.id === id);
        if (vid) positions.set(id, { x: vid.x, y: vid.y });
      });
      interactions.setDragStartPositions(positions);
    },
    [interactions, selectedIds, selectedIdsSet, setSelectedIds, videos],
  );

  const isVariationMode = useMemo(
    () =>
      selectedIds.length === 1 &&
      (variationMode === "image" || variationMode === "video"),
    [selectedIds.length, variationMode],
  );

  const roundedViewport = useMemo(
    () => ({
      scale: Math.round(viewport.scale * 100) / 100,
      x: Math.round(viewport.x / 10) * 10,
      y: Math.round(viewport.y / 10) * 10,
    }),
    [viewport.scale, viewport.x, viewport.y],
  );

  const selectedImageForVariation = useMemo(
    () =>
      isVariationMode ? images.find((img) => img.id === selectedIds[0]) : null,
    [images, isVariationMode, selectedIds],
  );

  const visibleImages = useMemo(() => {
    const videoSourceImageIds = new Set(
      videos.map((v) => v.sourceImageId).filter(Boolean),
    );
    const imagesToRender = images.filter(
      (img) => !videoSourceImageIds.has(img.id),
    );
    return getVisibleItems(imagesToRender, roundedViewport, canvasSize);
  }, [canvasSize, images, roundedViewport, videos]);

  const visibleVideos = useMemo(
    () => getVisibleItems(videos, roundedViewport, canvasSize),
    [canvasSize, roundedViewport, videos],
  );

  if (!isCanvasReady) return null;

  return (
    <>
      <Stage
        aria-label={ARIA_LABELS.STAGE}
        draggable={false}
        height={canvasSize.height}
        onContextMenu={handleContextMenu}
        onMouseDown={interactions.handleMouseDown}
        onMouseLeave={() => {}}
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

          {visibleImages.map((image) => (
            <CanvasImage
              dragStartPositions={interactions.dragStartPositions}
              image={image}
              isDraggingImage={interactions.isDraggingImage}
              isSelected={selectedIdsSet.has(image.id)}
              key={image.id}
              onChange={handleImageChange(image.id)}
              onDragEnd={handleImageDragEnd}
              onDragStart={() => handleImageDragStart(image.id)}
              onDoubleClick={onImageDoubleClick}
              onSelect={(e) => interactions.handleSelect(image.id, e)}
              selectedIds={selectedIds}
              setImages={setImages}
            />
          ))}

          {isVariationMode && selectedImageForVariation && (
            <VariationGhostPlaceholders
              generationCount={generationCount}
              isDragging={interactions.isDraggingImage}
              selectedImage={selectedImageForVariation}
              stageRef={stageRef}
              variationMode={variationMode}
            />
          )}

          {visibleVideos.map((video) => (
            <CanvasVideo
              dragStartPositions={interactions.dragStartPositions}
              isDraggingVideo={interactions.isDraggingImage}
              isSelected={selectedIdsSet.has(video.id)}
              key={video.id}
              onChange={handleVideoChange(video.id)}
              onDragEnd={() => handleVideoDragEnd(video.id)}
              onDragStart={() => handleVideoDragStart(video.id)}
              onSelect={(e) => interactions.handleSelect(video.id, e)}
              selectedIds={selectedIds}
              setVideos={setVideos}
              video={video}
            />
          ))}
        </Layer>
      </Stage>
    </>
  );
});
