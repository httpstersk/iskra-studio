/**
 * Jotai atoms for UI state management
 * Manages dialog visibility, settings, and UI preferences
 */

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { IMAGE_MODELS, type ImageModelId } from "@/lib/image-models";

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
export const showGridAtom = atomWithStorage("showGrid", true);
export const showMinimapAtom = atomWithStorage("showMinimap", true);

/**
 * Visibility control atoms
 */
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
 * "director": AI-generated variations with director visual signatures via FIBO
 * "lighting": Random lighting scenario variations via FIBO
 */
export const imageVariationTypeAtom = atom<
  | "camera-angles"
  | "director"
  | "lighting"
  | "storyline"
  | "characters"
  | "emotions"
  | "surface"
>("camera-angles");

/**
 * Image model atom - controls which model to use for image variations
 * "seedream": Seedream v4 Edit
 * "nano-banana": Nano Banana Edit (default)
 */
export const imageModelAtom = atom<ImageModelId>(IMAGE_MODELS.NANO_BANANA);

/**
 * Network status atom - tracks online/offline state
 *
 * @remarks
 * - Initialized with navigator.onLine value
 * - Updated by online/offline event listeners
 * - Used by sync manager to queue changes when offline
 */
export const isOnlineAtom = atom<boolean>(
  typeof window !== "undefined" ? navigator.onLine : true,
);

/**
 * FIBO Analysis atom - controls whether FIBO image analysis is enabled
 */
export const isFiboAnalysisEnabledAtom = atom(false);

/**
 * AI Provider atom - controls which AI generation provider to use
 * "fal": Fal.ai (current default)
 * "replicate": Replicate (Nano Banana Pro)
 */
export const aiProviderAtom = atomWithStorage<"fal" | "replicate">(
  "aiProvider",
  "fal",
);
