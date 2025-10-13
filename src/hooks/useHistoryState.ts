import { useState, useCallback, useEffect } from "react";
import type { PlacedImage, PlacedVideo, HistoryState } from "@/types/canvas";

export function useHistoryState(
  images: PlacedImage[],
  videos: PlacedVideo[],
  selectedIds: string[],
) {
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const saveToHistory = useCallback(() => {
    const newState = {
      images: [...images],
      videos: [...videos],
      selectedIds: [...selectedIds],
    };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [images, videos, selectedIds, history, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      return {
        images: prevState.images,
        videos: prevState.videos || [],
        selectedIds: prevState.selectedIds,
        newIndex: historyIndex - 1,
      };
    }
    return null;
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      return {
        images: nextState.images,
        videos: nextState.videos || [],
        selectedIds: nextState.selectedIds,
        newIndex: historyIndex + 1,
      };
    }
    return null;
  }, [history, historyIndex]);

  // Save initial state
  useEffect(() => {
    if (history.length === 0) {
      saveToHistory();
    }
  }, []);

  return {
    history,
    historyIndex,
    setHistoryIndex,
    saveToHistory,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };
}
