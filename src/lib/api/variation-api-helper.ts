/**
 * Generic helper for creating variation API handlers
 * Reduces duplication across director, camera angle, and lighting variation routes
 *
 * This module provides:
 * - Server-side: `handleVariations()` for API route handlers
 * - Client-side: `variationClientConfigs` for unified handler orchestration
 */

import { selectRandomVisualStylists } from "@/constants/visual-stylists";
import { generateFiboVariations } from "@/lib/services/fibo-variation-service";
import type { FiboStructuredPrompt } from "@/lib/adapters/fibo-to-analysis-adapter";
import type { PlacedImage } from "@/types/canvas";
import { selectRandomCameraVariations } from "@/utils/camera-variation-utils";
import { selectRandomLightingVariations } from "@/utils/lighting-variation-utils";

export interface VariationConfig<T extends string> {
  /**
   * Key name for the variation type in request/response
   * e.g., 'director', 'cameraAngle', 'lightingScenario'
   */
  itemKey: T;

  /**
   * Function to build the variation prompt
   */
  buildPrompt: (item: string, userContext?: string) => string;
}

export interface VariationInput<T extends string> {
  imageUrl: string;
  items: string[];
  userContext?: string;
  itemKey: T;
}

export interface VariationOutput<T extends string> {
  fiboAnalysis: unknown;
  refinedPrompts: Array<
    {
      [K in T]: string;
    } & {
      refinedStructuredPrompt: FiboStructuredPrompt;
    }
  >;
}

/**
 * Generic variation handler that works for any variation type
 */
export async function handleVariations<T extends string>(
  config: VariationConfig<T>,
  input: VariationInput<T>
): Promise<VariationOutput<T>> {
  const { imageUrl, items, userContext } = input;

  // Build variation prompts for each item
  const variations = items.map((item) => config.buildPrompt(item, userContext));

  // Generate FIBO variations using shared service
  const { fiboAnalysis, refinedPrompts } = await generateFiboVariations({
    imageUrl,
    variations,
  });

  // Transform result to match expected API response format
  const transformedPrompts = refinedPrompts.map((item, index) => ({
    [config.itemKey]: items[index],
    refinedStructuredPrompt: item.refinedStructuredPrompt,
  })) as VariationOutput<T>["refinedPrompts"];

  return {
    fiboAnalysis,
    refinedPrompts: transformedPrompts,
  };
}

/**
 * Pre-configured variation handlers for common types
 */
export const variationHandlers = {
  cameraAngle: {
    itemKey: "cameraAngle" as const,
    buildPrompt: (cameraAngle: string, userContext?: string) => {
      // 1. Define the primary Angle Instruction
      const angleInstruction = `Re-render the scene from this specific camera angle: ${cameraAngle}.`;

      // 2. Define the "Vibe Lock" (The immutable style constraint)
      const styleLock = `
      CRITICAL STYLE CONSTRAINT (VIBE LOCK):
      - AESTHETIC PRESERVATION: You must strictly preserve the exact color grading, lighting mood, saturation, contrast, and film grain of the original image.
      - NO AUTO-CORRECTION: Do not "fix" or "enhance" the lighting. The result must look like a raw capture from the exact same camera session as the source.
      - VISUAL CONTINUITY: The final image must feel indistinguishable in tone from the source.
    `.trim();

      if (userContext) {
        // MODE A: New Context + New Angle + LOCKED Vibe
        // Challenge: "Put me in a forest (userContext) from a low angle (cameraAngle), but keep the dark/blue mood of the original."
        return `
        ${angleInstruction}
        
        COMMAND: Transfer the subject to this new context: ${userContext}.
        
        EXECUTION RULES:
        1. GEOMETRY: Place the subject in the "${userContext}" at the requested angle.
        2. AESTHETIC TRANSFER: Force the "${userContext}" environment to adopt the color palette and lighting mood of the source image. 
        3. PROHIBITION: Do not use the "default" lighting for "${userContext}". If the source is dark, the new context must be rendered as dark.
        
        ${styleLock}
      `.trim();
      } else {
        // MODE B: Angle Change Only + LOCKED Vibe
        // Challenge: "Show me the side profile, but don't change the lighting."
        return `
        ${angleInstruction}
        
        INSTRUCTIONS:
        1. PERSPECTIVE: Rotate the camera around the subject to match the requested angle.
        2. BACKGROUND EXTENSION: If the new angle reveals new parts of the background, generate them to perfectly match the existing texture and lighting logic.
        
        ${styleLock}
      `.trim();
      }
    },
  },

  director: {
    itemKey: "director" as const,
    buildPrompt: (director: string, userContext?: string) => {
      // Base instruction regarding the director's signature look
      const styleInstruction = `Reimagine this image in the signature visual style of director/cinematographer ${director}. Apply their distinct color grading, lighting, lens choice, and compositional framing.`;

      if (userContext) {
        // MODE A: Director Style + New Context (e.g., "Wes Anderson" + "on the moon")
        return `
        ${styleInstruction}
        
        COMMAND: Transfer the subject into a new context: ${userContext}.
        
        EXECUTION GUIDE:
        1. SCENE GENERATION: Create the "${userContext}" environment, but design it specifically how ${director} would visualize it (e.g., use their typical production design and atmosphere).
        2. SUBJECT INTEGRATION: Place the subject in this new scene. The lighting on the subject must match the cinematic mood of the director.
        3. COHERENCE: The final image should look like a still frame from a ${director} movie set in this location.
      `.trim();
      } else {
        // MODE B: Director Style Transfer Only (Same Content)
        return `
        ${styleInstruction}
        
        INSTRUCTIONS:
        1. PRESERVE SUBJECT: Keep the main subject, their pose, and the general semantic content of the scene intact.
        2. TRANSFORM AESTHETIC: Overhaul the visual presentation (film grain, shadows, saturation, contrast) to strictly mimic the artistic direction of ${director}.
      `.trim();
      }
    },
  },

  lighting: {
    itemKey: "lightingScenario" as const,
    buildPrompt: (lightingScenario: string, userContext?: string) => {
      const lightInstruction = `Apply this specific lighting scenario: ${lightingScenario}.`;

      if (userContext) {
        // MODE A: New Context + New Lighting
        // Requirement: The new environment must be generated *around* this light source.
        return `
        ${lightInstruction}

        COMMAND: Transfer the subject into a new context: ${userContext}.

        EXECUTION RULES:
        1. ATMOSPHERE GENERATION: Generate the "${userContext}" environment specifically under the influence of the requested lighting ("${lightingScenario}").
        2. SUBJECT HARMONY: Relight the subject so their highlights, reflections, and color temperature match this new environment.
        3. SHADOW PHYSICS: Cast realistic shadows from the subject onto the new background, consistent with the direction of the light sources in "${lightingScenario}".
      `.trim();
      } else {
        // MODE B: Relighting the Current Scene
        // Requirement: Keep the geometry, change the pixels.
        return `
        ${lightInstruction}

        INSTRUCTIONS:
        1. GEOMETRY LOCK: Preserve the physical structure of the room/environment and the subject's pose exactly as is.
        2. GLOBAL RELIGHTING: Overhaul the global illumination, color grading, and shadows of the current scene to match "${lightingScenario}".
        3. OVERRIDE: Discard the original lighting mood. If the original was "Day" and the request is "Night", fully commit to the new time of day.
      `.trim();
      }
    },
  },
};

// =============================================================================
// CLIENT-SIDE CONFIGURATION
// =============================================================================

/**
 * Supported variation types for image generation
 */
export type VariationType = "director" | "cameraAngle" | "lighting";

/**
 * Maps the UI variation type to our internal variation type
 */
export type ImageVariationType = "camera-angles" | "director" | "lighting";

/**
 * Client-side configuration for a variation type
 * Used by the unified variation handler for orchestration
 */
export interface VariationClientConfig {
  /** Display name for logging and error messages */
  displayName: string;

  /** API endpoint for generating variations */
  apiEndpoint: string;

  /** Key name for items array in API request body */
  apiRequestKey: string;

  /** Key name for the item in API response (matches server itemKey) */
  responseItemKey: string;

  /** Function to select random items for variation */
  selectRandomItems: (count: number) => string[];

  /** Function to build prompt when FIBO analysis is disabled */
  buildPrompt: (item: string, userContext?: string) => string;

  /** Function to get metadata for placeholder images */
  getPlaceholderMeta: (item: string) => Partial<PlacedImage>;

  /** Optional function to get additional metadata after API response */
  getImageMeta?: (item: string) => Partial<PlacedImage>;
}

/**
 * Client-side configuration for all variation types
 * Single source of truth for variation behavior
 */
export const variationClientConfigs: Record<VariationType, VariationClientConfig> = {
  director: {
    displayName: "Director",
    apiEndpoint: "/api/generate-director-variations",
    apiRequestKey: "directors",
    responseItemKey: "director",
    selectRandomItems: selectRandomVisualStylists,
    buildPrompt: variationHandlers.director.buildPrompt,
    getPlaceholderMeta: () => ({}),
    getImageMeta: (director: string) => ({
      directorName: director,
      isDirector: true,
    }),
  },

  cameraAngle: {
    displayName: "Camera angle",
    apiEndpoint: "/api/generate-camera-angle-variations",
    apiRequestKey: "cameraAngles",
    responseItemKey: "cameraAngle",
    selectRandomItems: selectRandomCameraVariations,
    buildPrompt: variationHandlers.cameraAngle.buildPrompt,
    getPlaceholderMeta: (cameraAngle: string) => ({ cameraAngle }),
  },

  lighting: {
    displayName: "Lighting",
    apiEndpoint: "/api/generate-lighting-variations",
    apiRequestKey: "lightingScenarios",
    responseItemKey: "lightingScenario",
    selectRandomItems: selectRandomLightingVariations,
    buildPrompt: variationHandlers.lighting.buildPrompt,
    getPlaceholderMeta: (lightingScenario: string) => ({ lightingScenario }),
  },
};

/**
 * Maps UI variation type to internal variation type
 */
export function mapImageVariationType(
  imageVariationType: ImageVariationType
): VariationType {
  switch (imageVariationType) {
    case "camera-angles":
      return "cameraAngle";
    case "director":
      return "director";
    case "lighting":
      return "lighting";
  }
}
