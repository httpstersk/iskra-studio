/**
 * Jotai atoms for canvas state management
 * Centralized state atoms for the infinite canvas application
 */

import { atom } from "jotai";
import type { PlacedImage, PlacedVideo } from "@/types/canvas";

/**
 * Viewport configuration for canvas positioning and scaling
 */
export interface Viewport {
  scale: number;
  x: number;
  y: number;
}

/**
 * Canvas size dimensions
 */
export interface CanvasSize {
  height: number;
  width: number;
}

/**
 * Atom for placed images on the canvas
 */
export const imagesAtom = atom<PlacedImage[]>([]);

/**
 * Atom for placed videos on the canvas
 */
export const videosAtom = atom<PlacedVideo[]>([]);

/**
 * Atom for currently selected element IDs
 */
export const selectedIdsAtom = atom<string[]>([]);

/**
 * Atom for viewport position and scale
 */
export const viewportAtom = atom<Viewport>({
  scale: 1,
  x: 0,
  y: 0,
});

/**
 * Atom for canvas dimensions
 * Initialized with default values, updated on mount
 */
export const canvasSizeAtom = atom<CanvasSize>({
  height: 800,
  width: 1200,
});

/**
 * Atom to track if canvas is ready for rendering
 */
export const isCanvasReadyAtom = atom(false);
