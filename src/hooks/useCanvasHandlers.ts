import { CANVAS_STRINGS } from "@/constants/canvas";
import {
  combineImages,
  deleteElements,
  duplicateElements,
} from "@/lib/handlers/image-handlers";
import {
  bringForward as bringForwardHandler,
  sendBackward as sendBackwardHandler,
  sendToBack as sendToBackHandler,
  sendToFront as sendToFrontHandler,
} from "@/lib/handlers/layer-handlers";
import { showErrorFromException } from "@/lib/toast";
import type { PlacedImage, PlacedVideo } from "@/types/canvas";
import { useCallback } from "react";

/**
 * Canvas handler dependencies
 */
interface CanvasHandlerDeps {
  images: PlacedImage[];
  saveToHistory: () => void;
  selectedIds: string[];
  setImages: (
    images: PlacedImage[] | ((prev: PlacedImage[]) => PlacedImage[]),
  ) => void;
  setSelectedIds: (ids: string[]) => void;
  setVideos: (
    videos: PlacedVideo[] | ((prev: PlacedVideo[]) => PlacedVideo[]),
  ) => void;
  videos: PlacedVideo[];
}

/**
 * Canvas handler return type
 */
interface CanvasHandlers {
  handleBringForward: () => void;
  handleCombineImages: () => Promise<void>;
  handleDelete: () => void;
  handleDuplicate: () => void;
  handleSendBackward: () => void;
  handleSendToBack: () => void;
  handleSendToFront: () => void;
}

/**
 * Custom hook for managing canvas element operations
 *
 * Extracts canvas manipulation handlers (layer operations, delete, duplicate, combine)
 * from the main canvas component to improve separation of concerns and testability.
 *
 * @param deps - Canvas handler dependencies
 * @returns Canvas operation event handlers
 */
export function useCanvasHandlers(deps: CanvasHandlerDeps): CanvasHandlers {
  const {
    images,
    saveToHistory,
    selectedIds,
    setImages,
    setSelectedIds,
    setVideos,
    videos,
  } = deps;

  const handleBringForward = useCallback(() => {
    if (selectedIds.length === 0) return;
    saveToHistory();
    setImages(bringForwardHandler(images, selectedIds));
  }, [images, saveToHistory, selectedIds, setImages]);

  const handleCombineImages = useCallback(async () => {
    if (selectedIds.length < 2) return;
    saveToHistory();

    try {
      const combinedImage = await combineImages(images, selectedIds);
      setImages((prev) => [
        ...prev.filter((img) => !selectedIds.includes(img.id)),
        combinedImage,
      ]);
      setSelectedIds([combinedImage.id]);
    } catch (error) {
      showErrorFromException(
        CANVAS_STRINGS.ERRORS.COMBINE_FAILED,
        error,
        CANVAS_STRINGS.ERRORS.UNKNOWN_ERROR,
      );
    }
  }, [images, saveToHistory, selectedIds, setImages, setSelectedIds]);

  const handleDelete = useCallback(() => {
    saveToHistory();
    const { newImages, newVideos } = deleteElements(
      images,
      videos,
      selectedIds,
    );
    setImages(newImages);
    setSelectedIds([]);
    setVideos(newVideos);
  }, [
    images,
    saveToHistory,
    selectedIds,
    setImages,
    setSelectedIds,
    setVideos,
    videos,
  ]);

  const handleDuplicate = useCallback(() => {
    saveToHistory();
    const { newImages, newVideos } = duplicateElements(
      images,
      videos,
      selectedIds,
    );
    setImages((prev) => [...prev, ...newImages]);
    setVideos((prev) => [...prev, ...newVideos]);
    setSelectedIds([
      ...newImages.map((img) => img.id),
      ...newVideos.map((vid) => vid.id),
    ]);
  }, [
    images,
    saveToHistory,
    selectedIds,
    setImages,
    setSelectedIds,
    setVideos,
    videos,
  ]);

  const handleSendBackward = useCallback(() => {
    if (selectedIds.length === 0) return;
    saveToHistory();
    setImages(sendBackwardHandler(images, selectedIds));
  }, [images, saveToHistory, selectedIds, setImages]);

  const handleSendToBack = useCallback(() => {
    if (selectedIds.length === 0) return;
    saveToHistory();
    setImages(sendToBackHandler(images, selectedIds));
  }, [images, saveToHistory, selectedIds, setImages]);

  const handleSendToFront = useCallback(() => {
    if (selectedIds.length === 0) return;
    saveToHistory();
    setImages(sendToFrontHandler(images, selectedIds));
  }, [images, saveToHistory, selectedIds, setImages]);

  return {
    handleBringForward,
    handleCombineImages,
    handleDelete,
    handleDuplicate,
    handleSendBackward,
    handleSendToBack,
    handleSendToFront,
  };
}
