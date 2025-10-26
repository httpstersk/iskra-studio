/**
 * Jotai atoms for UI state management
 * Manages dialog visibility, settings, and UI preferences
 */

import { atom } from "jotai";

/**
 * Dialog visibility atoms
 */
export const isImageToVideoDialogOpenAtom = atom(false);
export const isSettingsDialogOpenAtom = atom(false);

/**
 * Video operation selection atoms
 */
export const selectedImageForVideoAtom = atom<string | null>(null);

/**
 * View settings atoms
 */
export const showChatAtom = atom(false);
export const showGridAtom = atom(true);
export const showMinimapAtom = atom(true);


/**
 * Visibility control atoms
 */
export const hiddenVideoControlsIdsAtom = atom<Set<string>>(new Set<string>());
export const visibleIndicatorsAtom = atom<Set<string>>(new Set<string>());

/**
 * Variation mode atom - controls type of variations (image or video)
 */
export const variationModeAtom = atom<"image" | "video">("image");

/**
 * Generation count atom - controls number of variations
 * For images: can be 4, 8, or 12
 * For videos: always 4
 */
export const generationCountAtom = atom<number>(4);

/**
 * Image variation type atom - controls type of image variations
 * "camera-angles": Random camera angle variations (default)
 * "storyline": AI-generated narrative sequences with exponential time progression
 */
export const imageVariationTypeAtom = atom<"camera-angles" | "storyline">("camera-angles");

/**
 * Image model atom - controls which model to use for image variations
 * "seedream": Seedream v4 Edit (default)
 * "reve": Reve Edit
 */
export const imageModelAtom = atom<"seedream" | "reve">("seedream");

/**
 * Network status atom - tracks online/offline state
 * 
 * @remarks
 * - Initialized with navigator.onLine value
 * - Updated by online/offline event listeners
 * - Used by sync manager to queue changes when offline
 */
export const isOnlineAtom = atom<boolean>(
  typeof window !== "undefined" ? navigator.onLine : true
);
