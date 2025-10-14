/**
 * useVideoKeyboardShortcuts
 *
 * Registers keyboard shortcuts for selected video: play/pause, seek, volume, mute.
 */

import { useEffect } from "react";

/**
 * Keyboard shortcuts for a selected video element.
 * Handles play/pause, seek, volume, and mute.
 */
export function useVideoKeyboardShortcuts(
  isSelected: boolean,
  api: {
    seekBy: (delta: number) => void;
    toggleMute: () => void;
    togglePlay: () => void;
    volumeBy: (delta: number) => void;
  },
) {
  useEffect(() => {
    if (!isSelected) return;

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true"
      ) {
        return;
      }

      switch (e.code) {
        case "Space":
          e.preventDefault();
          api.togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          api.seekBy(e.shiftKey ? -10 : -5);
          break;
        case "ArrowRight":
          e.preventDefault();
          api.seekBy(e.shiftKey ? 10 : 5);
          break;
        case "ArrowUp":
          e.preventDefault();
          api.volumeBy(0.1);
          break;
        case "ArrowDown":
          e.preventDefault();
          api.volumeBy(-0.1);
          break;
        case "KeyM":
          e.preventDefault();
          api.toggleMute();
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isSelected, api]);
}
