import { z } from "zod";

/**
 * FIBO-Based Storyline Schema
 *
 * Directly uses FIBO's structured output for storyline generation.
 * No inference or mapping - uses FIBO's native aesthetics.
 */

/**
 * FIBO Lighting structure
 */
export const fiboLightingSchema = z.object({
  conditions: z
    .string()
    .describe("Lighting conditions (e.g., 'dim indoor', 'bright outdoor')"),
  direction: z
    .string()
    .describe("Light direction (e.g., 'backlit from doorway', '45° side key')"),
  shadows: z.string().describe("Shadow characteristics and quality"),
});

/**
 * FIBO Aesthetics structure
 */
export const fiboAestheticsSchema = z.object({
  composition: z
    .string()
    .describe(
      "Compositional approach (e.g., 'centered, symmetrical', 'rule of thirds')",
    ),
  color_scheme: z
    .string()
    .describe(
      "Color palette and grading (e.g., 'teal-orange blockbuster', 'desaturated Nordic noir')",
    ),
  mood_atmosphere: z.string().describe("Mood and atmospheric feeling"),
  preference_score: z
    .string()
    .optional()
    .describe("Aesthetic preference rating"),
  aesthetic_score: z
    .string()
    .optional()
    .describe("Overall aesthetic quality score"),
});

/**
 * FIBO Photographic Characteristics
 */
export const fiboPhotographicCharacteristicsSchema = z.object({
  depth_of_field: z
    .string()
    .describe("Depth of field description (e.g., 'shallow', 'deep')"),
  focus: z
    .string()
    .describe(
      "Focus characteristics (e.g., 'sharp focus on subject', 'soft overall')",
    ),
  camera_angle: z
    .string()
    .describe(
      "Camera angle and perspective (e.g., 'eye-level', 'low angle', 'overhead')",
    ),
  lens_focal_length: z
    .string()
    .describe(
      "Lens focal length description (e.g., '35mm-50mm', 'telephoto', 'wide-angle')",
    ),
});

/**
 * FIBO Object structure (for reference context)
 */
export const fiboObjectSchema = z.object({
  description: z.string().describe("Object/subject description"),
  location: z
    .string()
    .describe("Position in frame (e.g., 'center', 'left', 'background')"),
  relationship: z.string().describe("Relationship to other elements"),
  relative_size: z.string().describe("Size relative to frame"),
  shape_and_color: z.string().describe("Visual characteristics"),
  texture: z.string().describe("Surface texture"),
  appearance_details: z.string().describe("Detailed appearance notes"),
  pose: z.string().optional().describe("Pose if applicable"),
  expression: z.string().optional().describe("Expression if applicable"),
  clothing: z.string().optional().describe("Clothing if applicable"),
  action: z.string().optional().describe("Action being performed"),
  orientation: z.string().optional().describe("Orientation in space"),
});

/**
 * Complete FIBO Analysis (for input)
 */
export const fiboAnalysisSchema = z.object({
  short_description: z
    .string()
    .describe("Brief description of the reference image"),
  objects: z
    .array(fiboObjectSchema)
    .describe("Objects/subjects in the reference"),
  background_setting: z.string().describe("Background environment description"),
  lighting: fiboLightingSchema,
  aesthetics: fiboAestheticsSchema,
  photographic_characteristics: fiboPhotographicCharacteristicsSchema,
  style_medium: z
    .string()
    .describe("Style medium (e.g., 'photograph', 'digital art', '35mm film')"),
  context: z.string().describe("Contextual information about the scene"),
  artistic_style: z
    .string()
    .describe(
      "Artistic style classification (e.g., 'minimalist', 'dramatic', 'noir')",
    ),
});

/**
 * Single storyline image concept with FIBO aesthetics
 */
export const fiboStorylineImageConceptSchema = z.object({
  prompt: z
    .string()
    .describe("Complete generation prompt with FIBO aesthetics embedded"),
  timeElapsed: z
    .number()
    .describe("Time elapsed in minutes since reference moment"),
  timeLabel: z
    .string()
    .describe("Formatted time label (e.g., '+1min', '+2h5m')"),
  narrativeNote: z
    .string()
    .describe("Brief narrative description of this story beat"),

  // FIBO aesthetics preserved for this frame
  aesthetics: fiboAestheticsSchema.describe(
    "Visual aesthetics matching reference",
  ),
  lighting: fiboLightingSchema.describe("Lighting setup matching reference"),
  photographic_characteristics: fiboPhotographicCharacteristicsSchema.describe(
    "Camera/lens characteristics",
  ),
  style_medium: z.string().describe("Medium/format maintained from reference"),
  artistic_style: z
    .string()
    .describe("Artistic style maintained from reference"),
});

/**
 * Set of storyline concepts
 */
export const fiboStorylineConceptSetSchema = z.object({
  concepts: z
    .array(fiboStorylineImageConceptSchema)
    .describe("Array of storyline image concepts"),

  // Reference analysis preserved
  reference_analysis: fiboAnalysisSchema.describe(
    "Original FIBO analysis used as style reference",
  ),
});

// Type exports
export type FiboLighting = z.infer<typeof fiboLightingSchema>;
export type FiboAesthetics = z.infer<typeof fiboAestheticsSchema>;
export type FiboPhotographicCharacteristics = z.infer<
  typeof fiboPhotographicCharacteristicsSchema
>;
export type FiboObject = z.infer<typeof fiboObjectSchema>;
export type FiboAnalysis = z.infer<typeof fiboAnalysisSchema>;
export type FiboStorylineImageConcept = z.infer<
  typeof fiboStorylineImageConceptSchema
>;
export type FiboStorylineConceptSet = z.infer<
  typeof fiboStorylineConceptSetSchema
>;
