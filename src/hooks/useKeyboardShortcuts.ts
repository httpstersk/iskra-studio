import { useEffect } from "react";
import type { PlacedImage, GenerationSettings } from "@/types/canvas";
import type { Viewport } from "./useCanvasState";

interface UseKeyboardShortcutsProps {
  images: PlacedImage[];
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  croppingImageId: string | null;
  setCroppingImageId: (id: string | null) => void;
  generationSettings: GenerationSettings;
  isGenerating: boolean;
  viewport: Viewport;
  setViewport: (viewport: Viewport) => void;
  canvasSize: { width: number; height: number };
  undo: () => void;
  redo: () => void;
  handleDelete: () => void;
  handleDuplicate: () => void;
  handleRun: () => void;
  sendToFront: () => void;
  sendToBack: () => void;
  bringForward: () => void;
  sendBackward: () => void;
}

export function useKeyboardShortcuts({
  images,
  selectedIds,
  setSelectedIds,
  croppingImageId,
  setCroppingImageId,
  generationSettings,
  isGenerating,
  viewport,
  setViewport,
  canvasSize,
  undo,
  redo,
  handleDelete,
  handleDuplicate,
  handleRun,
  sendToFront,
  sendToBack,
  bringForward,
  sendBackward,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
        setSelectedIds(images.map((img) => img.id));
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
      // Escape to exit crop mode
      else if (e.key === "Escape" && croppingImageId) {
        e.preventDefault();
        setCroppingImageId(null);
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
  }, [
    selectedIds,
    images,
    generationSettings,
    undo,
    redo,
    handleDelete,
    handleDuplicate,
    handleRun,
    croppingImageId,
    viewport,
    canvasSize,
    sendToFront,
    sendToBack,
    bringForward,
    sendBackward,
    setSelectedIds,
    setCroppingImageId,
    setViewport,
    isGenerating,
  ]);
}
