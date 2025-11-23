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
  buildPrompt: (item: string, userContext?: string, index?: number) => string;
}

export interface VariationInput<T extends string> {
  imageUrls: string[];
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
  const { imageUrls, items, userContext } = input;

  // Build variation prompts for each item
  const variations = items.map((item, index) =>
    config.buildPrompt(item, userContext, index)
  );

  // Generate FIBO variations using shared service
  const { fiboAnalysis, refinedPrompts } = await generateFiboVariations({
    imageUrls,
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
      - AESTHETIC PRESERVATION: You must strictly preserve the exact color grading, lighting mood, saturation, contrast, and film grain of the reference images.
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
        2. AESTHETIC TRANSFER: Force the "${userContext}" environment to adopt the color palette and lighting mood of the reference images. 
        3. PROHIBITION: Do not use the "default" lighting for "${userContext}". If the source is dark, the new context must be rendered as dark.
        4. DUAL REFERENCE: If two reference images are provided, consider one for the character/subject and the other for the vibe/scene.
        
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
        3. DUAL REFERENCE: If two reference images are provided, consider one for the character/subject and the other for the vibe/scene.
        
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
        4. DUAL REFERENCE: If two reference images are provided, consider one for the character/subject and the other for the vibe/scene.
      `.trim();
      } else {
        // MODE B: Director Style Transfer Only (Same Content)
        return `
        ${styleInstruction}
        
        INSTRUCTIONS:
        1. PRESERVE SUBJECT: Keep the main subject, their pose, and the general semantic content of the scene intact.
        2. TRANSFORM AESTHETIC: Overhaul the visual presentation (film grain, shadows, saturation, contrast) to strictly mimic the artistic direction of ${director}.
        3. DUAL REFERENCE: If two reference images are provided, consider one for the character/subject and the other for the vibe/scene.
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
        4. DUAL REFERENCE: If two reference images are provided, consider one for the character/subject and the other for the vibe/scene.
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
        4. DUAL REFERENCE: If two reference images are provided, consider one for the character/subject and the other for the vibe/scene.
      `.trim();
      }
    },
  },

  storyline: {
    itemKey: "storyline" as const,
    buildPrompt: (_item: string, userContext?: string, index?: number) => {
      const step = (index ?? 0) + 1;
      const baseInstruction = `Create a cinematic shot that expands the narrative of the source image.`;

      // Define the "Vibe Lock" (The immutable style constraint)
      const styleLock = `
      CRITICAL STYLE CONSTRAINT (VIBE LOCK):
      - AESTHETIC PRESERVATION: You must strictly preserve the exact color grading, lighting mood, saturation, contrast, and film grain of the reference images.
      - NO AUTO-CORRECTION: Do not "fix" or "enhance" the lighting. The result must look like a raw capture from the exact same camera session as the source.
      - VISUAL CONTINUITY: The final image must feel indistinguishable in tone from the source.
      `.trim();

      const progressionHeader = `
      PROGRESSION STEP ${step}:
      This is frame ${step} of a sequential narrative.
      `;

      if (userContext) {
        return `
        ${baseInstruction}
        ${progressionHeader}
        
        NARRATIVE CONTEXT: ${userContext}
        
        INSTRUCTIONS:
        1. STORY CONTINUATION: Use the source image as the starting point and the provided context to evolve the scene. Show us "what happens next" or "a different perspective" implied by the context.
        2. VISUAL CONSISTENCY: Maintain the same character(s), art style, and general atmosphere as the source image, but adapt the environment or action to fit the new narrative beat.
        3. CINEMATIC FRAMING: Compose the shot to tell a story. Use lighting and blocking to emphasize the emotional tone of the context.
        4. DUAL REFERENCE: If two reference images are provided, consider one for the character/subject and the other for the vibe/scene.
        
        ${styleLock}
        `.trim();
      } else {
        return `
        ${baseInstruction}
        ${progressionHeader}
        
        INSTRUCTIONS:
        1. IMPLIED NARRATIVE: Infer a story from the visual elements of the source image and advance it one step. What is the subject doing? Where are they going?
        2. WORLD BUILDING: Expand the view to reveal more of the world or context that wasn't visible in the original frame, while keeping the style consistent.
        3. DYNAMIC ACTION: If the source is static, introduce subtle movement or interaction that suggests a developing plot.
        4. DUAL REFERENCE: If two reference images are provided, consider one for the character/subject and the other for the vibe/scene.
        
        ${styleLock}
        `.trim();
      }
    },
  },

  characters: {
    itemKey: "characters" as const,
    buildPrompt: (_item: string, userContext?: string, index?: number) => {
      const step = (index ?? 0) + 1;
      const baseInstruction = `Create a completely different character based on the reference image.`;

      // Define the "Vibe Lock" (The immutable style constraint)
      const styleLock = `
      CRITICAL STYLE CONSTRAINT (VIBE LOCK):
      - AESTHETIC PRESERVATION: You must strictly preserve the exact color grading, lighting mood, saturation, contrast, and film grain of the reference images.
      - NO AUTO-CORRECTION: Do not "fix" or "enhance" the lighting. The result must look like a raw capture from the exact same camera session as the source.
      - VISUAL CONTINUITY: The final image must feel indistinguishable in tone from the source.
      `.trim();

      const characterHeader = `
      CHARACTER VARIATION ${step}:
      This is character variation ${step}.
      `;

      if (userContext) {
        return `
        ${baseInstruction}
        ${characterHeader}
        
        CHARACTER CONTEXT: ${userContext}
        
        INSTRUCTIONS:
        1. NEW CHARACTER IDENTITY: Generate a **completely different person** from the source image. Change facial features, ethnicity, age, or body type while fitting the provided context.
        2. VISUAL CONSISTENCY: Maintain the same art style, clothing style, and general atmosphere as the source image.
        3. POSE AND EXPRESSION: Adapt the pose and expression to fit the new character's personality and the context.
        4. DUAL REFERENCE: If two reference images are provided, consider one for the character/subject and the other for the vibe/scene.
        
        ${styleLock}
        `.trim();
      } else {
        return `
        ${baseInstruction}
        ${characterHeader}
        
        INSTRUCTIONS:
        1. DISTINCT IDENTITY: Generate a **completely different person** from the source image. The face must be clearly distinct.
        2. CONSISTENT STYLE: Ensure the clothing, accessories, and overall look match the aesthetic of the source.
        3. VARIATION: Significantly change features like hair, facial structure, and demographics while keeping the "vibe" identical.
        4. DUAL REFERENCE: If two reference images are provided, consider one for the character/subject and the other for the vibe/scene.
        
        ${styleLock}
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
export type VariationType = "director" | "cameraAngle" | "lighting" | "storyline" | "characters";

/**
 * Maps the UI variation type to our internal variation type
 */
export type ImageVariationType =
  | "camera-angles"
  | "director"
  | "lighting"
  | "storyline"
  | "characters";

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
  buildPrompt: (item: string, userContext?: string, index?: number) => string;

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

  storyline: {
    displayName: "Storyline",
    apiEndpoint: "/api/generate-storyline-variations",
    apiRequestKey: "storylines",
    responseItemKey: "storyline",
    // For storyline, we don't have specific items, so we just generate generic labels
    selectRandomItems: (count: number) =>
      Array.from({ length: count }, (_, i) => `Story Variation ${i + 1}`),
    buildPrompt: variationHandlers.storyline.buildPrompt,
    getPlaceholderMeta: (storyline: string) => ({
      storyline,
    }),
  },

  characters: {
    displayName: "Characters",
    apiEndpoint: "/api/generate-characters-variations",
    apiRequestKey: "characters",
    responseItemKey: "characters",
    // For characters, we generate generic labels
    selectRandomItems: (count: number) =>
      Array.from({ length: count }, (_, i) => `Character Variation ${i + 1}`),
    buildPrompt: variationHandlers.characters.buildPrompt,
    getPlaceholderMeta: (characters: string) => ({
      characters,
    }),
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
    case "storyline":
      return "storyline";
    case "characters":
      return "characters";
  }
}
