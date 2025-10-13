import { z } from "zod";

export const imageStyleMoodAnalysisSchema = z.object({
  colorPalette: z.object({
    dominant: z
      .array(z.string())
      .describe(
        "3-5 specific color names (e.g., 'electric cobalt', 'sunset amber')"
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
      .describe("Atmospheric qualities: haze, volumetric, clear, etc."),
  }),

  visualStyle: z.object({
    aesthetic: z
      .array(z.string())
      .describe(
        "Visual aesthetics: cinematic, editorial, surreal, minimalist, etc."
      ),
    texture: z
      .array(z.string())
      .describe("Surface qualities and textures present"),
    composition: z
      .string()
      .describe("Overall compositional approach and balance"),
    depth: z.enum(["flat", "layered", "deep-perspective"]),
  }),

  mood: z.object({
    primary: z.string().describe("Primary emotional tone"),
    secondary: z.array(z.string()).describe("Additional emotional layers"),
    energy: z.enum(["calm", "moderate", "dynamic", "explosive"]),
    atmosphere: z.string().describe("Overall atmospheric feeling"),
  }),

  cinematicPotential: z.object({
    motionStyle: z
      .array(z.string())
      .describe(
        "Types of motion that would fit: smooth, frenetic, slow, rhythmic, etc."
      ),
    camerawork: z
      .array(z.string())
      .describe(
        "Camera techniques that would enhance: push-in, orbit, tilt, etc."
      ),
    editingPace: z.enum([
      "slow-contemplative",
      "measured",
      "fast-cuts",
      "rapid-fire",
    ]),
    visualEffects: z
      .array(z.string())
      .describe(
        "Effects that would amplify the mood: light streaks, particles, etc."
      ),
  }),

  narrativeTone: z.object({
    genre: z
      .array(z.string())
      .describe(
        "Cinematic genres this evokes: thriller, fashion, experimental, etc."
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
