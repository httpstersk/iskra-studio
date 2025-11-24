/**
 * Generic helper for creating variation API handlers
 * Reduces duplication across director, camera angle, and lighting variation routes
 *
 * This module provides:
 * - Server-side: `handleVariations()` for API route handlers
 * - Client-side: `variationClientConfigs` for unified handler orchestration
 */

import { selectRandomVisualStylists } from "@/constants/visual-stylists";
import type { FiboStructuredPrompt } from "@/lib/adapters/fibo-to-analysis-adapter";
import { generateFiboVariations } from "@/lib/services/fibo-variation-service";
import type { PlacedImage } from "@/types/canvas";
import { selectRandomCameraVariations } from "@/utils/camera-variation-utils";
import { selectRandomEmotionVariations } from "@/utils/emotion-variation-utils";
import { selectRandomLightingVariations } from "@/utils/lighting-variation-utils";

/**
 * Narrative time progression labels for storyline variations (supports up to 12 variations)
 */
const STORYLINE_TIME_PROGRESSIONS = [
  "Moments later",
  "Later that day",
  "The next day",
  "Days later",
  "Weeks later",
  "Months later",
  "A year later",
  "Years later",
  "A decade later",
  "A generation later",
  "A lifetime later",
  "An era later",
];

/**
 * Surface map types for 3D modeling and cinema workflows
 */
const SURFACE_MAP_TYPES = [
  "Albedo / Base Color (De-lit)",
  "Ambient Occlusion (AO)",
  "Anisotropy Map",
  "Clearcoat Map",
  "Curvature Map",
  "Depth Map (Z-Depth)",
  "Displacement / Height Map",
  "Emission Map",
  "Flow Map (Vector Field)",
  "Fuzz / Sheen Map",
  "Glossiness Map",
  "IOR (Index of Refraction) Map",
  "Metallic Map",
  "Normal Map (Object Space)",
  "Normal Map (Tangent Space)",
  "Opacity / Alpha Map",
  "Roughness Map",
  "Segmentation / ID Map",
  "Specular Map",
  "Subsurface Scattering (SSS) Map",
  "Thickness Map",
  "Translucency Map",
  "UV Layout / Checkerboard",
  "Wireframe Overlay",
];

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
      const timeProgressions = [
        {
          label: "Moments later",
          description:
            "The same person, seconds to minutes after the previous image.",
          aging: "Identical age and appearance.",
          environment: "Identical setting and lighting.",
        },
        {
          label: "Later that day",
          description: "The same person, hours later on the same day.",
          aging: "Identical age. May have a change of clothes or expression.",
          environment:
            "Same location, but the time of day has changed (e.g., afternoon to evening).",
        },
        {
          label: "The next day",
          description: "The same person, 24 hours later.",
          aging: "Identical age and appearance.",
          environment:
            "A similar or new location, reflecting the start of a new day.",
        },
        {
          label: "Days later",
          description: "The same person, several days have passed.",
          aging: "Identical age, but may show a different mood or hairstyle.",
          environment:
            "A different location or the same location with noticeable changes (e.g., weather).",
        },
        {
          label: "Weeks later",
          description: "The same person, several weeks have passed.",
          aging:
            "Subtle changes. New hairstyle, slight change in weight, or different fashion style.",
          environment: "Hints of early seasonal changes in the background.",
        },
        {
          label: "Months later",
          description: "The same person, several months have passed.",
          aging:
            "Noticeable changes. Significantly different hairstyle, potential change in skin tone (tan or paler), clear evolution in clothing style.",
          environment:
            "Obvious change of season (e.g., summer to winter). The location can be entirely different.",
        },
        {
          label: "A year later",
          description: "The same person, one full year later.",
          aging:
            "Subtle but clear signs of being one year older. A touch more maturity in the face.",
          environment:
            "The same season as the original, but with signs of a year's passage (e.g., plants have grown, minor wear and tear on objects).",
        },
        {
          label: "Years later",
          description: "The same person, 3-5 years have passed.",
          aging:
            "MANDATORY VISIBLE AGING. Show early signs like crow's feet, subtle forehead lines, and a more mature facial structure.",
          environment:
            "Updated technology (newer phone model), fashion styles from a few years later, renovated spaces.",
        },
        {
          label: "A decade later",
          description: "The same person, 10 years have passed.",
          aging:
            "CRITICAL AGING. Prominent wrinkles, some graying hair (around 30-50%), visible changes in skin texture.",
          environment:
            "Major environmental shift. Technology is a decade newer, buildings show age or renovation, fashion reflects the new era.",
        },
        {
          label: "A generation later",
          description: "The same person, 20-30 years have passed.",
          aging:
            "NON-NEGOTIABLE ELDERLY APPEARANCE. Fully gray or white hair, deep wrinkles, aged posture, weathered skin.",
          environment:
            "A transformed world. The original technology is now antique, new architectural styles are present, fashion is from a different generation.",
        },
        {
          label: "A lifetime later",
          description: "The same person, 50+ years have passed.",
          aging:
            "VERY OLD. Extremely elderly appearance (80+ years old). Thin, white hair, significant wrinkles, a frail look.",
          environment:
            "Unrecognizable era. Futuristic elements, historical locations are now landmarks, or the environment reflects significant societal change.",
        },
        {
          label: "An era later",
          description: "Distant future, 100+ years have passed.",
          aging:
            "LEGACY OF THE PERSON. The person is likely gone. Show their legacy via a memorial, a framed photo in a futuristic home, or a statue.",
          environment:
            "A completely different world. Sci-fi aesthetics, potential effects of climate change, new civilization.",
        },
      ];

      const cinematicConcepts = [
        "An intimate close-up focusing on the subject's emotional state (e.g., joy, contemplation, determination).",
        "A wide establishing shot showing the subject in a new, expansive environment that reveals their current life.",
        "An action shot, capturing the subject in the middle of a significant, defining activity.",
        "A quiet, candid moment of introspection, interacting with a meaningful object.",
        "A shot from a unique perspective (e.g., high angle, low angle, through a window) to create a specific mood.",
        "A medium shot showing the subject's interaction with a new person, pet, or key element in their life.",
        "A scene with dramatic, moody lighting (e.g., silhouette, chiaroscuro) that emphasizes feeling over detail.",
        "A portrait that directly confronts the camera, capturing the wisdom and experience gained over the elapsed time.",
        "A 'day in the life' shot, showing a mundane but narratively significant moment in their evolved routine.",
        "A dynamic shot showing the subject traveling or moving towards a new destination.",
        "A scene of conflict or challenge, with body language and expression telling the story.",
        "A moment of peaceful resolution or celebration, showing the outcome of a recent life event.",
      ];

      const progression =
        timeProgressions[Math.min(index ?? 0, timeProgressions.length - 1)];

      const currentConcept =
        cinematicConcepts[(index ?? 0) % cinematicConcepts.length];

      return `
      ## 1. CORE INSTRUCTION: CINEMATIC TIME PROGRESSION
      Generate a photorealistic image of the **same person** from the reference image, but **${progression.label}**. The image must be a new, distinct scene that progresses the narrative.

      ## 2. VISUAL DNA & CINEMATIC CONTINUITY (NON-NEGOTIABLE)
      **The aesthetic of the reference image is the law for this entire series.** The generated image MUST perfectly match the following attributes of the original:
      - **Color Grading:** Replicate the exact color palette, saturation, contrast, and black levels. If the original has a teal-and-orange grade, this image must too.
      - **Lighting Style:** Match the quality of light (e.g., soft diffused, hard direct), the mood (e.g., high-key, low-key), and the overall lighting philosophy.
      - **Camera & Lens Properties:** Reproduce the same depth of field, film grain, lens flares, and textural quality. The new image must feel like it was shot on the same camera and lens.

      ## 3. SUBJECT IDENTITY & AGING (CRITICAL)
      - **Subject:** This is the EXACT SAME PERSON. Maintain core facial features while applying the required aging.
      - **Aging Requirement:** ${progression.aging} This is a MANDATORY change. The subject MUST look the specified age.

      ## 4. CINEMATIC SCENE & NARRATIVE (MANDATORY CHANGE)
      - **Cinematic Concept:** The scene must be completely new. Frame this shot as: **${currentConcept}**
      - **Visual Storytelling:** Use composition and body language to imply what has changed in the subject's life.

      ## 5. ENVIRONMENT & CONTEXT (MANDATORY CHANGE)
      - **Environment Requirement:** ${progression.environment}
      - **Location:** The setting must be appropriate for the cinematic concept and the time period.

      ## 6. WHAT TO AVOID (IMPORTANT)
      - **NO STYLE DEVIATION:** Do NOT alter the color grade, lighting style, or camera properties from the original reference.
      - **NO REPETITIVE COMPOSITION:** Do NOT use a similar camera angle or shot type as the previous image.
      - **NO AGELESSNESS:** Do NOT make the person look the same age (unless specified). This is a critical failure.
      - **NO GENERIC FACES:** AVOID generating a different person.
      `.trim();
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

  emotions: {
    itemKey: "emotions" as const,
    buildPrompt: (emotion: string, userContext?: string) => {
      const baseInstruction = `Reimagine the subject with this specific emotion: ${emotion}.`;

      // Define the "Vibe Lock" (The immutable style constraint)
      const styleLock = `
      CRITICAL STYLE CONSTRAINT (VIBE LOCK):
      - AESTHETIC PRESERVATION: You must strictly preserve the exact color grading, lighting mood, saturation, contrast, and film grain of the reference images.
      - NO AUTO-CORRECTION: Do not "fix" or "enhance" the lighting. The result must look like a raw capture from the exact same camera session as the source.
      - VISUAL CONTINUITY: The final image must feel indistinguishable in tone from the source.
      `.trim();

      if (userContext) {
        return `
        ${baseInstruction}
        
        CONTEXT: ${userContext}
        
        INSTRUCTIONS:
        1. EMOTIONAL SHIFT: Alter the subject's facial expression and body language to convey "${emotion}" while fitting the provided context.
        2. VISUAL CONSISTENCY: Maintain the same character identity, art style, and general atmosphere as the source image.
        3. CONTEXTUAL INTEGRATION: Ensure the emotion feels natural within the "${userContext}" setting.
        4. DUAL REFERENCE: If two reference images are provided, consider one for the character/subject and the other for the vibe/scene.
        
        ${styleLock}
        `.trim();
      } else {
        return `
        ${baseInstruction}
        
        INSTRUCTIONS:
        1. EXPRESSION CHANGE: Modify the subject's face and posture to clearly demonstrate "${emotion}".
        2. IDENTITY PRESERVATION: Keep the character's identity and features consistent with the source.
        3. STYLE MATCHING: Ensure the lighting, texture, and overall look remain identical to the original.
        4. DUAL REFERENCE: If two reference images are provided, consider one for the character/subject and the other for the vibe/scene.
        
        ${styleLock}
        `.trim();
      }
    },
  },

  surface: {
    itemKey: "surfaceMap" as const,
    buildPrompt: (mapType: string, userContext?: string) => {
      const baseInstruction = `Generate a ${mapType} based on the reference image.`;

      if (userContext) {
        return `
        ${baseInstruction}
        
        ADDITIONAL CONTEXT/INSTRUCTION: ${userContext}
        
        INSTRUCTIONS:
        1. ANALYSIS: Analyze the geometry, texture, and lighting of the reference image.
        2. INTERPRETATION: Apply the additional context to the generation of the ${mapType} (e.g., if the context implies a specific material property or modification).
        3. GENERATION: Create a high-quality ${mapType} that aligns with the reference image's content and the provided context.
        4. OUTPUT: The result should be a technical pass suitable for 3D workflows or compositing.
        5. STRICT ALIGNMENT: The generated map must match the pixel space of the original image exactly.
        `.trim();
      }

      return `
      ${baseInstruction}
      
      INSTRUCTIONS:
      1. ANALYSIS: Analyze the geometry, texture, and lighting of the reference image.
      2. GENERATION: Create a high-quality ${mapType} that perfectly aligns with the reference image's content.
      3. OUTPUT: The result should be a technical pass suitable for 3D workflows or compositing.
      4. STRICT ALIGNMENT: The generated map must match the pixel space of the original image exactly.
      `.trim();
    },
  },
};

// =============================================================================
// CLIENT-SIDE CONFIGURATION
// =============================================================================

/**
 * Supported variation types for image generation
 */
export type VariationType =
  | "director"
  | "cameraAngle"
  | "lighting"
  | "storyline"
  | "characters"
  | "emotions"
  | "surface";

/**
 * Maps the UI variation type to our internal variation type
 */
export type ImageVariationType =
  | "camera-angles"
  | "director"
  | "lighting"
  | "storyline"
  | "characters"
  | "emotions"
  | "surface";

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
export const variationClientConfigs: Record<
  VariationType,
  VariationClientConfig
> = {
  director: {
    displayName: "Director",
    apiEndpoint: "/api/generate-director-variations",
    apiRequestKey: "directors",
    responseItemKey: "director",
    selectRandomItems: selectRandomVisualStylists,
    buildPrompt: variationHandlers.director.buildPrompt,
    getPlaceholderMeta: () => ({ variationType: "director" }),
    getImageMeta: (director: string) => ({
      directorName: director,
      isDirector: true,
      variationType: "director",
    }),
  },

  cameraAngle: {
    displayName: "Camera angle",
    apiEndpoint: "/api/generate-camera-angle-variations",
    apiRequestKey: "cameraAngles",
    responseItemKey: "cameraAngle",
    selectRandomItems: selectRandomCameraVariations,
    buildPrompt: variationHandlers.cameraAngle.buildPrompt,
    getPlaceholderMeta: (cameraAngle: string) => ({
      cameraAngle,
      variationType: "camera",
    }),
  },

  lighting: {
    displayName: "Lighting",
    apiEndpoint: "/api/generate-lighting-variations",
    apiRequestKey: "lightingScenarios",
    responseItemKey: "lightingScenario",
    selectRandomItems: selectRandomLightingVariations,
    buildPrompt: variationHandlers.lighting.buildPrompt,
    getPlaceholderMeta: (lightingScenario: string) => ({
      lightingScenario,
      variationType: "lighting",
    }),
  },

  storyline: {
    displayName: "Storyline",
    apiEndpoint: "/api/generate-storyline-variations",
    apiRequestKey: "storylines",
    responseItemKey: "storyline",
    // Generate narrative time progression labels ("Moments later", "Later that day", etc.)
    selectRandomItems: (count: number) =>
      STORYLINE_TIME_PROGRESSIONS.slice(0, count),
    buildPrompt: variationHandlers.storyline.buildPrompt,
    getPlaceholderMeta: (storylineLabel: string) => ({
      storylineLabel,
      variationType: "storyline",
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
    getPlaceholderMeta: (characterVariation: string) => ({
      characterVariation,
      variationType: "character",
    }),
  },

  emotions: {
    displayName: "Emotions",
    apiEndpoint: "/api/generate-emotions-variations",
    apiRequestKey: "emotions",
    responseItemKey: "emotions",
    selectRandomItems: selectRandomEmotionVariations,
    buildPrompt: variationHandlers.emotions.buildPrompt,
    getPlaceholderMeta: (emotion: string) => ({
      emotion,
      variationType: "emotion",
    }),
  },

  surface: {
    displayName: "Surface Maps",
    apiEndpoint: "/api/generate-surface-variations",
    apiRequestKey: "surfaceMaps",
    responseItemKey: "surfaceMap",
    selectRandomItems: (count: number) => {
      // Shuffle and select 'count' items
      return [...SURFACE_MAP_TYPES]
        .sort(() => 0.5 - Math.random())
        .slice(0, count);
    },
    buildPrompt: variationHandlers.surface.buildPrompt,
    getPlaceholderMeta: (surfaceMap: string) => ({
      surfaceMap,
      variationType: "surface",
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
    case "characters":
      return "characters";
    case "emotions":
      return "emotions";
    case "storyline":
      return "storyline";
    case "surface":
      return "surface";
  }
}
