"use client";

import React from "react";
import { Stage, Layer } from "react-konva";
import type Konva from "konva";
import { CanvasGrid } from "./CanvasGrid";
import { SelectionBoxComponent } from "./SelectionBox";
import { CanvasImage } from "./CanvasImage";
import { CanvasVideo } from "./CanvasVideo";
import { CropOverlayWrapper } from "./CropOverlayWrapper";
import { createCroppedImage } from "@/lib/handlers/image-handlers";
import { CANVAS_DIMENSIONS, ARIA_LABELS } from "@/constants/canvas";
import type {
  PlacedImage,
  PlacedVideo,
  SelectionBox,
  GenerationSettings,
} from "@/types/canvas";
import type { Viewport } from "@/hooks/useCanvasState";
import { VariationGhostPlaceholders } from "./VariationGhostPlaceholders";
import { VariationNumbersOverlay } from "./VariationNumbersOverlay";

/**
 * Props for the CanvasStageRenderer component
 */
interface CanvasStageRendererProps {
  canvasSize: { height: number; width: number };
  croppingImageId: string | null;
  generationSettings: GenerationSettings;
  hiddenVideoControlsIds: Set<string>;
  images: PlacedImage[];
  interactions: {
    dragStartPositions: Map<string, { x: number; y: number }>;
    handleMouseDown: (
      e: Konva.KonvaEventObject<MouseEvent>,
      setCroppingImageId: (id: string | null) => void
    ) => void;
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
  saveToHistory: () => void;
  selectedIds: string[];
  setCroppingImageId: (id: string | null) => void;
  setHiddenVideoControlsIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setImages: React.Dispatch<React.SetStateAction<PlacedImage[]>>;
  setSelectedIds: (ids: string[]) => void;
  setVideos: React.Dispatch<React.SetStateAction<PlacedVideo[]>>;
  showGrid: boolean;
  stageRef: React.RefObject<Konva.Stage | null>;
  videos: PlacedVideo[];
  viewport: Viewport;
}

/**
 * Filters visible items based on viewport bounds
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
 * CanvasStageRenderer component
 * Renders the Konva Stage with all canvas elements
 */
export function CanvasStageRenderer({
  canvasSize,
  croppingImageId,
  generationSettings,
  isGenerating,
  hiddenVideoControlsIds,
  images,
  interactions,
  isCanvasReady,
  saveToHistory,
  selectedIds,
  setCroppingImageId,
  setHiddenVideoControlsIds,
  setImages,
  setSelectedIds,
  setVideos,
  showGrid,
  stageRef,
  videos,
  viewport,
}: CanvasStageRendererProps) {
  const visibleImages = getVisibleItems(images, viewport, canvasSize);
  const visibleVideos = getVisibleItems(videos, viewport, canvasSize);

  // Check if we're in variation mode (one image selected, no prompt)
  const isVariationMode =
    selectedIds.length === 1 &&
    !generationSettings.prompt.trim() &&
    !croppingImageId;
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

  const handleCropEnd = async () => {
    const croppingImage = images.find((img) => img.id === croppingImageId);
    if (!croppingImage) return;

    const cropHeight = croppingImage.cropHeight || 1;
    const cropWidth = croppingImage.cropWidth || 1;
    const cropX = croppingImage.cropX || 0;
    const cropY = croppingImage.cropY || 0;

    try {
      const croppedImageSrc = await createCroppedImage(
        croppingImage.src,
        cropX,
        cropY,
        cropWidth,
        cropHeight
      );

      setImages((prev) =>
        prev.map((img) =>
          img.id === croppingImageId
            ? {
                ...img,
                cropHeight: undefined,
                cropWidth: undefined,
                cropX: undefined,
                cropY: undefined,
                height: cropHeight * img.height,
                src: croppedImageSrc,
                width: cropWidth * img.width,
                x: img.x + cropX * img.width,
                y: img.y + cropY * img.height,
              }
            : img
        )
      );
    } catch (error) {
      console.error("Failed to create cropped image:", error);
    }

    setCroppingImageId(null);
    saveToHistory();
  };

  if (!isCanvasReady) return null;

  return (
    <>
      <Stage
        aria-label={ARIA_LABELS.STAGE}
        draggable={false}
        height={canvasSize.height}
        onContextMenu={handleContextMenu}
        onMouseDown={(e) => interactions.handleMouseDown(e, setCroppingImageId)}
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
        <Layer>
          {showGrid && (
            <CanvasGrid canvasSize={canvasSize} viewport={viewport} />
          )}
          <SelectionBoxComponent selectionBox={interactions.selectionBox} />

          {/* Render visible images */}
          {visibleImages.map((image) => (
            <CanvasImage
              dragStartPositions={interactions.dragStartPositions}
              image={image}
              isCroppingImage={croppingImageId === image.id}
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
              onDoubleClick={() => setCroppingImageId(image.id)}
              onDragEnd={handleImageDragEnd}
              onDragStart={() => handleImageDragStart(image.id)}
              onSelect={(e) => interactions.handleSelect(image.id, e)}
              selectedIds={selectedIds}
              setImages={setImages}
            />
          ))}

          {/* Ghost placeholders for variation mode */}
          {isVariationMode && selectedImageForVariation && (
            <VariationGhostPlaceholders
              selectedImage={selectedImageForVariation}
            />
          )}

          {/* Render visible videos */}
          {visibleVideos.map((video) => (
            <CanvasVideo
              dragStartPositions={interactions.dragStartPositions}
              isCroppingVideo={false}
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

          {/* Crop overlay */}
          {croppingImageId &&
            (() => {
              const croppingImage = images.find(
                (img) => img.id === croppingImageId
              );
              if (!croppingImage) return null;
              return (
                <CropOverlayWrapper
                  image={croppingImage}
                  onCropChange={(crop) => {
                    setImages((prev) =>
                      prev.map((img) =>
                        img.id === croppingImageId ? { ...img, ...crop } : img
                      )
                    );
                  }}
                  onCropEnd={handleCropEnd}
                  viewportScale={viewport.scale}
                />
              );
            })()}
        </Layer>
      </Stage>

      {isVariationMode && selectedImageForVariation && (
        <VariationNumbersOverlay
          selectedImage={selectedImageForVariation}
          viewport={viewport}
          canvasSize={canvasSize}
          isGenerating={isGenerating}
          images={images}
        />
      )}
    </>
  );
}
