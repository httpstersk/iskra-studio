import type {
  GenerationSettings,
  PlacedImage,
  PlacedVideo,
} from "@/types/canvas";
import { useEffect, useRef } from "react";
import type { Viewport } from "./useCanvasState";

interface UseKeyboardShortcutsProps {
  bringForward: () => void;
  canvasSize: { width: number; height: number };
  generationSettings: GenerationSettings;
  handleDelete: () => void;
  handleDuplicate: () => void;
  handleRun: () => void;
  images: PlacedImage[];
  isGenerating: boolean;
  redo: () => void;
  selectedIds: string[];
  sendBackward: () => void;
  sendToBack: () => void;
  sendToFront: () => void;
  setSelectedIds: (ids: string[]) => void;
  setViewport: (viewport: Viewport) => void;
  undo: () => void;
  videos: PlacedVideo[];
  viewport: Viewport;
}

export function useKeyboardShortcuts({
  bringForward,
  canvasSize,
  generationSettings,
  handleDelete,
  handleDuplicate,
  handleRun,
  images,
  isGenerating,
  redo,
  selectedIds,
  sendBackward,
  sendToBack,
  sendToFront,
  setSelectedIds,
  setViewport,
  undo,
  videos,
  viewport,
}: UseKeyboardShortcutsProps) {
  // Use ref to store latest props without triggering effect re-runs
  const propsRef = useRef({
    bringForward,
    canvasSize,
    generationSettings,
    handleDelete,
    handleDuplicate,
    handleRun,
    images,
    isGenerating,
    redo,
    selectedIds,
    sendBackward,
    sendToBack,
    sendToFront,
    setSelectedIds,
    setViewport,
    undo,
    videos,
    viewport,
  });

  // Update ref on every render
  propsRef.current = {
    bringForward,
    canvasSize,
    generationSettings,
    handleDelete,
    handleDuplicate,
    handleRun,
    images,
    isGenerating,
    redo,
    selectedIds,
    sendBackward,
    sendToBack,
    sendToFront,
    setSelectedIds,
    setViewport,
    undo,
    videos,
    viewport,
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const {
        bringForward,
        canvasSize,
        generationSettings,
        handleDelete,
        handleDuplicate,
        handleRun,
        images,
        isGenerating,
        redo,
        selectedIds,
        sendBackward,
        sendToBack,
        sendToFront,
        setSelectedIds,
        setViewport,
        undo,
        videos,
        viewport,
      } = propsRef.current;
      const isInputElement =
        e.target && (e.target as HTMLElement).matches("input, textarea");

      // Undo/Redo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        (e.metaKey || e.ctrlKey) &&
        ((e.key === "z" && e.shiftKey) || e.key === "y")
      ) {
        e.preventDefault();
        redo();
      }
      // Select all
      else if ((e.metaKey || e.ctrlKey) && e.key === "a" && !isInputElement) {
        e.preventDefault();
        const allIds = [
          ...images.map((img) => img.id),
          ...videos.map((vid) => vid.id),
        ];
        setSelectedIds(allIds);
      }
      // Delete
      else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        !isInputElement
      ) {
        if (selectedIds.length > 0) {
          e.preventDefault();
          handleDelete();
        }
      }
      // Duplicate
      else if ((e.metaKey || e.ctrlKey) && e.key === "d" && !isInputElement) {
        e.preventDefault();
        if (selectedIds.length > 0) {
          handleDuplicate();
        }
      }
      // Run generation
      else if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "Enter" &&
        !isInputElement
      ) {
        e.preventDefault();
        if (!isGenerating && generationSettings.prompt.trim()) {
          handleRun();
        }
      }
      // Layer ordering shortcuts
      else if (e.key === "]" && !isInputElement) {
        e.preventDefault();
        if (selectedIds.length > 0) {
          if (e.metaKey || e.ctrlKey) {
            sendToFront();
          } else {
            bringForward();
          }
        }
      } else if (e.key === "[" && !isInputElement) {
        e.preventDefault();
        if (selectedIds.length > 0) {
          if (e.metaKey || e.ctrlKey) {
            sendToBack();
          } else {
            sendBackward();
          }
        }
      }
      // Zoom in
      else if ((e.key === "+" || e.key === "=") && !isInputElement) {
        e.preventDefault();
        const newScale = Math.min(5, viewport.scale * 1.2);
        const centerX = canvasSize.width / 2;
        const centerY = canvasSize.height / 2;

        const mousePointTo = {
          x: (centerX - viewport.x) / viewport.scale,
          y: (centerY - viewport.y) / viewport.scale,
        };

        setViewport({
          x: centerX - mousePointTo.x * newScale,
          y: centerY - mousePointTo.y * newScale,
          scale: newScale,
        });
      }
      // Zoom out
      else if (e.key === "-" && !isInputElement) {
        e.preventDefault();
        const newScale = Math.max(0.1, viewport.scale / 1.2);
        const centerX = canvasSize.width / 2;
        const centerY = canvasSize.height / 2;

        const mousePointTo = {
          x: (centerX - viewport.x) / viewport.scale,
          y: (centerY - viewport.y) / viewport.scale,
        };

        setViewport({
          x: centerX - mousePointTo.x * newScale,
          y: centerY - mousePointTo.y * newScale,
          scale: newScale,
        });
      }
      // Reset zoom
      else if (e.key === "0" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setViewport({ x: 0, y: 0, scale: 1 });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []); // ✅ Empty deps - uses ref for latest values
}
