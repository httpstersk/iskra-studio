import { z } from "zod";

export const imageStyleMoodAnalysisSchema = z.object({
  subject: z.object({
    type: z
      .string()
      .describe(
        "What is the main subject/object in the scene (e.g., 'person', 'cityscape', 'nature', 'object')",
      ),
    description: z
      .string()
      .describe(
        "Brief description of the subject (e.g., 'lone figure standing', 'neon-lit street', 'geometric patterns')",
      ),
    context: z
      .string()
      .describe(
        "What the subject is doing or represents (e.g., 'contemplating', 'in motion', 'at rest')",
      ),
  }),

  colorPalette: z.object({
    dominant: z
      .array(z.string())
      .min(3)
      .max(5)
      .describe(
        "3-5 specific color names (e.g., 'electric cobalt', 'sunset amber')",
      ),
    mood: z.string().describe("How the colors make you feel"),
    saturation: z.enum(["muted", "balanced", "vibrant", "hyper-saturated"]),
    temperature: z.enum(["cool", "neutral", "warm", "mixed"]),
  }),

  lighting: z.object({
    quality: z.enum([
      "soft-diffused",
      "hard-dramatic",
      "natural",
      "artificial",
      "mixed",
    ]),
    direction: z
      .string()
      .describe("Primary light direction and characteristics"),
    mood: z.string().describe("Emotional quality of the lighting"),
    atmosphere: z
      .array(z.string())
      .min(1)
      .describe("Atmospheric qualities: haze, volumetric, clear, etc."),
  }),

  visualStyle: z.object({
    aesthetic: z
      .array(z.string())
      .min(1)
      .describe(
        "Visual aesthetics: cinematic, editorial, surreal, minimalist, etc.",
      ),
    texture: z
      .array(z.string())
      .min(1)
      .describe("Surface qualities and textures present"),
    composition: z
      .string()
      .describe("Overall compositional approach and balance"),
    depth: z.enum(["flat", "layered", "deep-perspective"]),
  }),

  mood: z.object({
    primary: z.string().describe("Primary emotional tone"),
    secondary: z
      .array(z.string())
      .min(2)
      .describe("Additional emotional layers (at least 2)"),
    energy: z.enum(["calm", "moderate", "dynamic", "explosive"]),
    atmosphere: z.string().describe("Overall atmospheric feeling"),
  }),

  cinematicPotential: z.object({
    motionStyle: z
      .array(z.string())
      .min(2)
      .describe(
        "Types of motion that would fit: smooth, frenetic, slow, rhythmic, etc.",
      ),
    camerawork: z
      .array(z.string())
      .min(2)
      .describe(
        "Camera techniques that would enhance: push-in, orbit, tilt, etc.",
      ),
    editingPace: z.enum([
      "slow-contemplative",
      "measured",
      "fast-cuts",
      "rapid-fire",
    ]),
    visualEffects: z
      .array(z.string())
      .min(2)
      .describe(
        "Effects that would amplify the mood: light streaks, particles, etc.",
      ),
  }),

  narrativeTone: z.object({
    genre: z
      .array(z.string())
      .min(2)
      .describe(
        "Cinematic genres this evokes: thriller, fashion, experimental, etc. (at least 2)",
      ),
    intensity: z
      .number()
      .min(1)
      .max(10)
      .describe("Overall intensity level 1-10"),
    storytellingApproach: z
      .string()
      .describe("How to tell stories in this style"),
  }),
});

export type ImageStyleMoodAnalysis = z.infer<
  typeof imageStyleMoodAnalysisSchema
>;
