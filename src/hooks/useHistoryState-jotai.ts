/**
 * History state hook using Jotai
 * Manages undo/redo functionality for canvas operations
 */

import { useCallback, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  canRedoAtom,
  canUndoAtom,
  historyAtom,
  historyIndexAtom,
} from "@/store/history-atoms";
import type { PlacedImage, PlacedVideo, HistoryState } from "@/types/canvas";

/**
 * Hook to manage history state using Jotai atoms
 * Provides undo/redo functionality
 * 
 * @param images - Current images array
 * @param videos - Current videos array
 * @param selectedIds - Currently selected element IDs
 */
export function useHistoryState(
  images: PlacedImage[],
  videos: PlacedVideo[],
  selectedIds: string[]
) {
  const [history, setHistory] = useAtom(historyAtom);
  const [historyIndex, setHistoryIndex] = useAtom(historyIndexAtom);
  const canUndo = useAtomValue(canUndoAtom);
  const canRedo = useAtomValue(canRedoAtom);

  /**
   * Saves current state to history
   */
  const saveToHistory = useCallback(() => {
    const newState: HistoryState = {
      images: [...images],
      selectedIds: [...selectedIds],
      videos: [...videos],
    };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex, images, selectedIds, setHistory, setHistoryIndex, videos]);

  /**
   * Undoes the last action
   * @returns Previous state if available, null otherwise
   */
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      return {
        images: prevState.images,
        newIndex: historyIndex - 1,
        selectedIds: prevState.selectedIds,
        videos: prevState.videos || [],
      };
    }
    return null;
  }, [history, historyIndex]);

  /**
   * Redoes the last undone action
   * @returns Next state if available, null otherwise
   */
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      return {
        images: nextState.images,
        newIndex: historyIndex + 1,
        selectedIds: nextState.selectedIds,
        videos: nextState.videos || [],
      };
    }
    return null;
  }, [history, historyIndex]);

  // Save initial state
  useEffect(() => {
    if (history.length === 0) {
      saveToHistory();
    }
  }, [history.length, saveToHistory]);

  return {
    canRedo,
    canUndo,
    history,
    historyIndex,
    redo,
    saveToHistory,
    setHistoryIndex,
    undo,
  };
}
