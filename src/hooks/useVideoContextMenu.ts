/**
 * Hook for handling video context menu interactions
 *
 * @module hooks/useVideoContextMenu
 */

import { useCallback } from "react";

/**
 * Creates a context menu handler that dispatches synthetic events to the canvas
 *
 * @param videoId - The ID of the video element
 * @returns Context menu event handler
 */
export function useVideoContextMenu(videoId: string) {
  return useCallback(
    (e: React.MouseEvent<HTMLVideoElement>) => {
      e.preventDefault();

      const konvaContainer = document.querySelector(".konvajs-content");
      if (!konvaContainer) return;

      const canvas = konvaContainer.querySelector("canvas");
      if (!canvas) return;

      const event = new MouseEvent("contextmenu", {
        bubbles: true,
        button: 2,
        buttons: 2,
        cancelable: true,
        clientX: e.clientX,
        clientY: e.clientY,
        screenX: e.screenX,
        screenY: e.screenY,
        view: window,
      });

      (event as MouseEvent & { videoId?: string }).videoId = videoId;

      canvas.dispatchEvent(event);
    },
    [videoId],
  );
}
