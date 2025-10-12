/**
 * Jotai atoms for AI generation state management
 * Manages image and video generation state
 */

import { atom } from "jotai";
import type {
  ActiveGeneration,
  ActiveVideoGeneration,
  GenerationSettings,
} from "@/types/canvas";

/**
 * Atom for generation settings (prompt, style)
 */
export const generationSettingsAtom = atom<GenerationSettings>({
  prompt: "",
  styleId: "custom",
});

/**
 * Atom to track the previous style ID for restoration
 */
export const previousStyleIdAtom = atom<string>("custom");

/**
 * Atom to track if image generation is in progress
 */
export const isGeneratingAtom = atom(false);

/**
 * Atom for active image generation jobs
 */
export const activeGenerationsAtom = atom<Map<string, ActiveGeneration>>(
  new Map()
);

/**
 * Atom for active video generation jobs
 */
export const activeVideoGenerationsAtom = atom<
  Map<string, ActiveVideoGeneration>
>(new Map());

/**
 * Atom to track if image-to-video conversion is in progress
 */
export const isConvertingToVideoAtom = atom(false);

/**
 * Atom to track if video transformation is in progress
 */
export const isTransformingVideoAtom = atom(false);

/**
 * Atom to track if video extension is in progress
 */
export const isExtendingVideoAtom = atom(false);


/**
 * Atom to track previous generation count for success detection
 */
export const previousGenerationCountAtom = atom(0);

/**
 * Atom to show success indicator after generation completes
 */
export const showSuccessAtom = atom(false);
