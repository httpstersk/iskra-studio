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
  variationPrompt: "",
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
  new Map(),
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
 * Atom to track previous generation count for success detection
 */
export const previousGenerationCountAtom = atom(0);

/**
 * Atom to show success indicator after generation completes
 */
export const showSuccessAtom = atom(false);

/**
 * Atom to track selected video model
 */
export const videoModelAtom = atom<
  "sora-2" | "sora-2-pro" | "veo-3.1" | "veo-3.1-pro"
>("sora-2");

/**
 * Atom to track selected video duration (4, 8, or 12 seconds)
 */
export const videoDurationAtom = atom<"4" | "8" | "12">("8");

/**
 * Atom to track selected video resolution (auto, 720p, or 1080p)
 */
export const videoResolutionAtom = atom<"auto" | "720p" | "1080p">("auto");
