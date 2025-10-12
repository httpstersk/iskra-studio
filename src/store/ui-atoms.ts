/**
 * Jotai atoms for UI state management
 * Manages dialog visibility, settings, and UI preferences
 */

import { atom } from "jotai";

/**
 * Dialog visibility atoms
 */
export const isApiKeyDialogOpenAtom = atom(false);
export const isExtendVideoDialogOpenAtom = atom(false);
export const isImageToVideoDialogOpenAtom = atom(false);
export const isSettingsDialogOpenAtom = atom(false);
export const isVideoToVideoDialogOpenAtom = atom(false);

/**
 * Video operation selection atoms
 */
export const selectedImageForVideoAtom = atom<string | null>(null);
export const selectedVideoForExtendAtom = atom<string | null>(null);
export const selectedVideoForVideoAtom = atom<string | null>(null);


/**
 * View settings atoms
 */
export const showChatAtom = atom(false);
export const showGridAtom = atom(true);
export const showMinimapAtom = atom(true);

/**
 * API key atoms
 */
export const customApiKeyAtom = atom<string>("");
export const tempApiKeyAtom = atom<string>("");

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
