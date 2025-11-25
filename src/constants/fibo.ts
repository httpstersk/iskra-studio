/**
 * FIBO Model Constants
 *
 * Centralized configuration for Bria FIBO model parameters via official Bria API.
 * All FIBO-related constants should be defined here.
 *
 * @see https://docs.bria.ai/image-generation/v2-endpoints
 */

import { generateFiboSeed } from "@/utils/fibo-seed-generator";

/**
 * Default FIBO analysis parameters
 */
export const FIBO_ANALYSIS = {
  /** Extended timeout for batch operations in milliseconds */
  EXTENDED_TIMEOUT: 45000,
  /** Request timeout in milliseconds */
  REQUEST_TIMEOUT: 30000,
} as const;

/**
 * Default FIBO generation parameters
 */
export const FIBO_GENERATION = {
  /** Default aspect ratio */
  DEFAULT_ASPECT_RATIO: "16:9" as const,
  /** Default guidance scale */
  DEFAULT_GUIDANCE_SCALE: 5,
  /** Default number of steps */
  DEFAULT_STEPS: 50,
} as const;

/**
 * Generates a random seed for FIBO operations.
 * Wrapper function for convenience when importing from constants.
 *
 * @returns A random seed number between 1 and 9,999
 */
export function getFiboSeed(): number {
  return generateFiboSeed();
}

/**
 * Default FIBO analysis object to use when analysis is disabled.
 * Provides neutral/balanced values for all fields.
 */
export const DEFAULT_FIBO_ANALYSIS = {
  subject: {
    type: "subject",
    description: "A subject in a scene",
    context: "present in the frame",
  },
  colorPalette: {
    dominant: ["neutral", "balanced", "natural"],
    grading: "natural and balanced",
    mood: "neutral",
    saturation: "balanced",
    temperature: "neutral",
  },
  lighting: {
    quality: "natural",
    direction: "balanced lighting",
    mood: "neutral",
    atmosphere: ["clear"],
  },
  visualStyle: {
    aesthetic: ["cinematic"],
    composition: "balanced",
    depth: "layered",
    filmGrain: "none",
    postProcessing: ["none"],
    texture: ["smooth"],
  },
  mood: {
    primary: "neutral",
    secondary: ["calm", "balanced"],
    energy: "moderate",
    atmosphere: "neutral",
  },
  styleSignature: {
    aspectRatio: "16:9",
    colorimetry: {
      brightness: "medium",
      contrast: "medium",
      harmony: "neutral",
      highlightTint: "neutral",
      saturation: "balanced",
      shadowTint: "neutral",
      warmth: "neutral",
    },
    emotionVector: {
      awe: 50,
      melancholy: 50,
      mystery: 50,
      nostalgia: 50,
      romance: 50,
      serenity: 50,
      tension: 50,
      wonder: 50,
    },
    lensLanguage: {
      apertureF: "f/2.8",
      depthOfField: "medium",
      focalLengthMm: 50,
      lensType: "spherical",
      look: "standard",
    },
    lightingSignature: {
      back: "subtle",
      contrastRatio: "mid-key",
      fill: "balanced",
      key: "soft",
    },
    postProcessingSignature: {
      filmGrainIntensity: 0,
      halation: false,
      vignette: "none",
    },
    rhythm: {
      cadence: "steady",
      tempo: "measured",
    },
    styleLockPrompt:
      "Cinematic style with balanced lighting and natural colors.",
  },
  cinematicPotential: {
    motionStyle: ["smooth", "steady"],
    camerawork: ["static", "pan"],
    editingPace: "measured",
    visualEffects: ["none"],
  },
  narrativeTone: {
    cinematographer: "Roger Deakins",
    director: "Denis Villeneuve",
    genre: ["drama", "cinematic"],
    intensity: 5,
    storytellingApproach: "visual",
  },
} as const;
