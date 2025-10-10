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
import { styleModels } from "@/lib/models";

const simpsonsStyle = styleModels.find((m) => m.id === "simpsons");

/**
 * Atom for generation settings (prompt, style, LoRA)
 */
export const generationSettingsAtom = atom<GenerationSettings>({
  loraUrl: simpsonsStyle?.loraUrl || "",
  prompt: simpsonsStyle?.prompt || "",
  styleId: simpsonsStyle?.id || "simpsons",
});

/**
 * Atom to track the previous style ID for restoration
 */
export const previousStyleIdAtom = atom<string>(
  simpsonsStyle?.id || "simpsons"
);

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
 * Atom to track if video background removal is in progress
 */
export const isRemovingVideoBackgroundAtom = atom(false);

/**
 * Atom to track if object isolation is in progress
 */
export const isIsolatingAtom = atom(false);

/**
 * Atom to track previous generation count for success detection
 */
export const previousGenerationCountAtom = atom(0);

/**
 * Atom to show success indicator after generation completes
 */
export const showSuccessAtom = atom(false);
