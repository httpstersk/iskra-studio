import { useState, useCallback } from "react";
import type Konva from "konva";
import type { PlacedImage, PlacedVideo, SelectionBox } from "@/types/canvas";
import type { Viewport } from "./useCanvasState";

export function useCanvasInteractions(
  viewport: Viewport,
  setViewport: (viewport: Viewport) => void,
  canvasSize: { width: number; height: number },
  images: PlacedImage[],
  videos: PlacedVideo[],
  selectedIds: string[],
  setSelectedIds: (ids: string[]) => void,
  croppingImageId: string | null
) {
  const [selectionBox, setSelectionBox] = useState<SelectionBox>({
    startX: 0,
    startY: 0,
    endX: 0,
    endY: 0,
    visible: false,
  });
  const [isSelecting, setIsSelecting] = useState(false);
  const [isPanningCanvas, setIsPanningCanvas] = useState(false);
  const [lastPanPosition, setLastPanPosition] = useState({ x: 0, y: 0 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dragStartPositions, setDragStartPositions] = useState<
    Map<string, { x: number; y: number }>
  >(new Map());

  // Touch event states for mobile
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(
    null
  );
  const [lastTouchCenter, setLastTouchCenter] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isTouchingImage, setIsTouchingImage] = useState(false);

  const handleSelect = useCallback(
    (id: string, e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey) {
        setSelectedIds(
          selectedIds.includes(id)
            ? selectedIds.filter((i) => i !== id)
            : [...selectedIds, id]
        );
      } else {
        setSelectedIds([id]);
      }
    },
    [selectedIds, setSelectedIds]
  );

  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      if (e.evt.ctrlKey) {
        // Pinch-to-zoom
        const oldScale = viewport.scale;
        const stage = e.target.getStage();
        const pointer = stage?.getPointerPosition();
        if (!pointer) return;

        const mousePointTo = {
          x: (pointer.x - viewport.x) / oldScale,
          y: (pointer.y - viewport.y) / oldScale,
        };

        const scaleBy = 1.01;
        const direction = e.evt.deltaY > 0 ? -1 : 1;
        const steps = Math.min(Math.abs(e.evt.deltaY), 10);
        let newScale = oldScale;

        for (let i = 0; i < steps; i++) {
          newScale = direction > 0 ? newScale * scaleBy : newScale / scaleBy;
        }

        const scale = Math.max(0.1, Math.min(5, newScale));
        const newPos = {
          x: pointer.x - mousePointTo.x * scale,
          y: pointer.y - mousePointTo.y * scale,
        };

        setViewport({ x: newPos.x, y: newPos.y, scale });
      } else {
        // Pan
        const deltaX = e.evt.shiftKey ? e.evt.deltaY : e.evt.deltaX;
        const deltaY = e.evt.shiftKey ? 0 : e.evt.deltaY;

        setViewport({
          ...viewport,
          x: viewport.x - deltaX,
          y: viewport.y - deltaY,
        });
      }
    },
    [viewport, setViewport]
  );

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>, setCroppingImageId: (id: string | null) => void) => {
      const clickedOnEmpty = e.target === e.target.getStage();
      const stage = e.target.getStage();
      const mouseButton = e.evt.button;

      if (mouseButton === 1) {
        e.evt.preventDefault();
        setIsPanningCanvas(true);
        setLastPanPosition({ x: e.evt.clientX, y: e.evt.clientY });
        return;
      }

      if (croppingImageId) {
        const clickedNode = e.target;
        const cropGroup = clickedNode.findAncestor((node: any) => {
          return node.attrs && node.attrs.name === "crop-overlay";
        });

        if (!cropGroup) {
          setCroppingImageId(null);
          return;
        }
      }

      if (clickedOnEmpty && !croppingImageId && mouseButton === 0) {
        const pos = stage?.getPointerPosition();
        if (pos) {
          const canvasPos = {
            x: (pos.x - viewport.x) / viewport.scale,
            y: (pos.y - viewport.y) / viewport.scale,
          };

          setIsSelecting(true);
          setSelectionBox({
            startX: canvasPos.x,
            startY: canvasPos.y,
            endX: canvasPos.x,
            endY: canvasPos.y,
            visible: true,
          });
          setSelectedIds([]);
        }
      }
    },
    [viewport, croppingImageId, setSelectedIds]
  );

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const stage = e.target.getStage();

      if (isPanningCanvas) {
        const deltaX = e.evt.clientX - lastPanPosition.x;
        const deltaY = e.evt.clientY - lastPanPosition.y;

        setViewport({
          ...viewport,
          x: viewport.x + deltaX,
          y: viewport.y + deltaY,
        });

        setLastPanPosition({ x: e.evt.clientX, y: e.evt.clientY });
        return;
      }

      if (!isSelecting) return;

      const pos = stage?.getPointerPosition();
      if (pos) {
        const canvasPos = {
          x: (pos.x - viewport.x) / viewport.scale,
          y: (pos.y - viewport.y) / viewport.scale,
        };

        setSelectionBox((prev) => ({
          ...prev,
          endX: canvasPos.x,
          endY: canvasPos.y,
        }));
      }
    },
    [isPanningCanvas, lastPanPosition, isSelecting, viewport, setViewport]
  );

  const handleMouseUp = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (isPanningCanvas) {
        setIsPanningCanvas(false);
        return;
      }

      if (!isSelecting) return;

      const box = {
        x: Math.min(selectionBox.startX, selectionBox.endX),
        y: Math.min(selectionBox.startY, selectionBox.endY),
        width: Math.abs(selectionBox.endX - selectionBox.startX),
        height: Math.abs(selectionBox.endY - selectionBox.startY),
      };

      if (box.width > 5 || box.height > 5) {
        const selectedImages = images.filter((img) => {
          return !(
            img.x + img.width < box.x ||
            img.x > box.x + box.width ||
            img.y + img.height < box.y ||
            img.y > box.y + box.height
          );
        });

        const selectedVideos = videos.filter((vid) => {
          return !(
            vid.x + vid.width < box.x ||
            vid.x > box.x + box.width ||
            vid.y + vid.height < box.y ||
            vid.y > box.y + box.height
          );
        });

        const selectedIds = [
          ...selectedImages.map((img) => img.id),
          ...selectedVideos.map((vid) => vid.id),
        ];

        if (selectedIds.length > 0) {
          setSelectedIds(selectedIds);
        }
      }

      setIsSelecting(false);
      setSelectionBox({ ...selectionBox, visible: false });
    },
    [
      isPanningCanvas,
      isSelecting,
      selectionBox,
      images,
      videos,
      setSelectedIds,
    ]
  );

  const handleTouchStart = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      const touches = e.evt.touches;
      const stage = e.target.getStage();

      if (touches.length === 2) {
        const touch1 = { x: touches[0].clientX, y: touches[0].clientY };
        const touch2 = { x: touches[1].clientX, y: touches[1].clientY };

        const distance = Math.sqrt(
          Math.pow(touch2.x - touch1.x, 2) + Math.pow(touch2.y - touch1.y, 2)
        );

        const center = {
          x: (touch1.x + touch2.x) / 2,
          y: (touch1.y + touch2.y) / 2,
        };

        setLastTouchDistance(distance);
        setLastTouchCenter(center);
      } else if (touches.length === 1) {
        const touch = { x: touches[0].clientX, y: touches[0].clientY };

        if (stage) {
          const pos = stage.getPointerPosition();
          if (pos) {
            const canvasPos = {
              x: (pos.x - viewport.x) / viewport.scale,
              y: (pos.y - viewport.y) / viewport.scale,
            };

            const touchedImage = images.some((img) => {
              return (
                canvasPos.x >= img.x &&
                canvasPos.x <= img.x + img.width &&
                canvasPos.y >= img.y &&
                canvasPos.y <= img.y + img.height
              );
            });

            setIsTouchingImage(touchedImage);
          }
        }

        setLastTouchCenter(touch);
      }
    },
    [viewport, images]
  );

  const handleTouchMove = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      const touches = e.evt.touches;

      if (touches.length === 2 && lastTouchDistance && lastTouchCenter) {
        e.evt.preventDefault();

        const touch1 = { x: touches[0].clientX, y: touches[0].clientY };
        const touch2 = { x: touches[1].clientX, y: touches[1].clientY };

        const distance = Math.sqrt(
          Math.pow(touch2.x - touch1.x, 2) + Math.pow(touch2.y - touch1.y, 2)
        );

        const center = {
          x: (touch1.x + touch2.x) / 2,
          y: (touch1.y + touch2.y) / 2,
        };

        const scaleFactor = distance / lastTouchDistance;
        const newScale = Math.max(0.1, Math.min(5, viewport.scale * scaleFactor));

        const stage = e.target.getStage();
        if (stage) {
          const stageBox = stage.container().getBoundingClientRect();
          const stageCenter = {
            x: center.x - stageBox.left,
            y: center.y - stageBox.top,
          };

          const mousePointTo = {
            x: (stageCenter.x - viewport.x) / viewport.scale,
            y: (stageCenter.y - viewport.y) / viewport.scale,
          };

          const newPos = {
            x: stageCenter.x - mousePointTo.x * newScale,
            y: stageCenter.y - mousePointTo.y * newScale,
          };

          setViewport({ x: newPos.x, y: newPos.y, scale: newScale });
        }

        setLastTouchDistance(distance);
        setLastTouchCenter(center);
      } else if (
        touches.length === 1 &&
        lastTouchCenter &&
        !isSelecting &&
        !isDraggingImage &&
        !isTouchingImage
      ) {
        const hasActiveFileInput = document.querySelector('input[type="file"]');
        if (!hasActiveFileInput) {
          e.evt.preventDefault();
        }

        const touch = { x: touches[0].clientX, y: touches[0].clientY };
        const deltaX = touch.x - lastTouchCenter.x;
        const deltaY = touch.y - lastTouchCenter.y;

        setViewport({
          ...viewport,
          x: viewport.x + deltaX,
          y: viewport.y + deltaY,
        });

        setLastTouchCenter(touch);
      }
    },
    [
      lastTouchDistance,
      lastTouchCenter,
      viewport,
      isSelecting,
      isDraggingImage,
      isTouchingImage,
      setViewport,
    ]
  );

  const handleTouchEnd = useCallback(
    (e: Konva.KonvaEventObject<TouchEvent>) => {
      setLastTouchDistance(null);
      setLastTouchCenter(null);
      setIsTouchingImage(false);
    },
    []
  );

  return {
    selectionBox,
    isSelecting,
    isPanningCanvas,
    isDraggingImage,
    setIsDraggingImage,
    dragStartPositions,
    setDragStartPositions,
    handleSelect,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
