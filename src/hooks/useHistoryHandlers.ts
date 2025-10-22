import { useCallback } from "react";
import type { PlacedImage, PlacedVideo } from "@/types/canvas";

/**
 * History handler dependencies
 */
interface HistoryHandlerDeps {
  canRedo: boolean;
  canUndo: boolean;
  redo: () => {
    images: PlacedImage[];
    newIndex: number;
    selectedIds: string[];
    videos: PlacedVideo[];
  } | null;
  setImages: (images: PlacedImage[]) => void;
  setSelectedIds: (ids: string[]) => void;
  setVideos: (videos: PlacedVideo[]) => void;
  undo: () => {
    images: PlacedImage[];
    newIndex: number;
    selectedIds: string[];
    videos: PlacedVideo[];
  } | null;
  updateHistoryIndex: (index: number) => void;
}

/**
 * History handler return type
 */
interface HistoryHandlers {
  handleRedo: () => void;
  handleUndo: () => void;
}

/**
 * Custom hook for managing undo/redo operations
 *
 * Extracts history-related event handlers from the main canvas component
 * to improve separation of concerns and testability.
 *
 * @param deps - History handler dependencies
 * @returns History event handlers
 */
export function useHistoryHandlers(deps: HistoryHandlerDeps): HistoryHandlers {
  const {
    redo,
    setImages,
    setSelectedIds,
    setVideos,
    undo,
    updateHistoryIndex,
  } = deps;

  const handleUndo = useCallback(() => {
    const result = undo();
    if (result) {
      setImages(result.images);
      setSelectedIds(result.selectedIds);
      setVideos(result.videos);
      updateHistoryIndex(result.newIndex);
    }
  }, [setImages, setSelectedIds, setVideos, undo, updateHistoryIndex]);

  const handleRedo = useCallback(() => {
    const result = redo();
    if (result) {
      setImages(result.images);
      setSelectedIds(result.selectedIds);
      setVideos(result.videos);
      updateHistoryIndex(result.newIndex);
    }
  }, [redo, setImages, setSelectedIds, setVideos, updateHistoryIndex]);

  return {
    handleRedo,
    handleUndo,
  };
}
