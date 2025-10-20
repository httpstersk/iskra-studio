import { z } from "zod";

/**
 * Schema describing structured analysis of an image's style and mood.
 * Includes a styleSignature used to lock aesthetic and emotional mood for generation.
 */
export const imageStyleMoodAnalysisSchema = z.object({
  subject: z.object({
    type: z
      .string()
      .describe(
        "What is the main subject/object in the scene (e.g., 'person', 'cityscape', 'nature', 'object')"
      ),
    description: z
      .string()
      .describe(
        "Brief description of the subject (e.g., 'lone figure standing', 'neon-lit street', 'geometric patterns')"
      ),
    context: z
      .string()
      .describe(
        "What the subject is doing or represents (e.g., 'contemplating', 'in motion', 'at rest')"
      ),
  }),

  colorPalette: z.object({
    dominant: z
      .array(z.string())
      .min(3)
      .max(5)
      .describe(
        "3-5 specific color names (e.g., 'electric cobalt', 'sunset amber')"
      ),
    grading: z
      .string()
      .describe(
        "Detailed color grading description (e.g., 'teal-orange blockbuster', 'desaturated Nordic noir', 'warm golden hour glow')"
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
        "Visual aesthetics: cinematic, editorial, surreal, minimalist, etc."
      ),
    composition: z
      .string()
      .describe("Overall compositional approach and balance"),
    depth: z.enum(["flat", "layered", "deep-perspective"]),
    filmGrain: z
      .string()
      .describe(
        "Film grain characteristics: none, subtle, moderate, heavy, or specific type (e.g., '35mm Kodak grain', 'digital noise', '16mm texture')"
      ),
    postProcessing: z
      .array(z.string())
      .min(1)
      .describe(
        "Post-processing effects present: vignette, bloom, chromatic aberration, lens distortion, halation, etc."
      ),
    texture: z
      .array(z.string())
      .min(1)
      .describe("Surface qualities and textures present"),
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

  /**
   * Precise, reproducible fingerprint of the image's cinematic style and mood.
   * Used to enforce exact matching across downstream generation.
   */
  styleSignature: z.object({
    aspectRatio: z
      .enum(["1:1", "3:2", "4:3", "9:16", "16:9", "1.85:1", "2.39:1", "21:9"])
      .describe("Perceived aspect ratio of the frame"),

    colorimetry: z
      .object({
        brightness: z
          .enum(["high", "low", "medium"])
          .describe("Overall scene brightness"),
        contrast: z
          .enum(["high", "low", "medium"])
          .describe("Global contrast level"),
        harmony: z
          .enum([
            "analogous",
            "complementary",
            "monochromatic",
            "neutral",
            "split-complementary",
            "tetradic",
            "triadic",
          ])
          .describe("Dominant color harmony relationship"),
        highlightTint: z.string().describe("Color cast in highlights"),
        saturation: z
          .enum(["muted", "balanced", "vibrant", "hyper-saturated"])
          .describe("Global saturation level"),
        shadowTint: z.string().describe("Color cast in shadows"),
        warmth: z
          .enum(["cool", "mixed", "neutral", "warm"])
          .describe("Overall color temperature perception"),
      })
      .describe("Color science characteristics that define mood"),

    emotionVector: z
      .object({
        awe: z.number().min(0).max(100),
        melancholy: z.number().min(0).max(100),
        mystery: z.number().min(0).max(100),
        nostalgia: z.number().min(0).max(100),
        romance: z.number().min(0).max(100),
        serenity: z.number().min(0).max(100),
        tension: z.number().min(0).max(100),
        wonder: z.number().min(0).max(100),
      })
      .describe("Eight-axis emotion intensity vector (0-100 per axis)"),

    lensLanguage: z
      .object({
        apertureF: z.string().describe("Estimated aperture (e.g., f/1.8)"),
        depthOfField: z.enum(["deep", "medium", "shallow"]),
        focalLengthMm: z
          .number()
          .min(10)
          .max(300)
          .describe("Approximate focal length (35mm equiv)"),
        lensType: z.enum(["anamorphic", "spherical", "unknown"]),
        look: z
          .string()
          .describe(
            "Lens look characteristics (e.g., oval bokeh, barrel distortion, edge softness)"
          ),
      })
      .describe("Optical characteristics shaping the mood"),

    lightingSignature: z
      .object({
        back: z.string().describe("Back/rim light characteristics"),
        contrastRatio: z
          .enum(["high-key", "low-key", "mid-key", "unknown"])
          .describe("Key/fill contrast style"),
        fill: z.string().describe("Fill light characteristics"),
        key: z.string().describe("Key light characteristics"),
      })
      .describe("Lighting design summarized for reproducibility"),

    postProcessingSignature: z
      .object({
        filmGrainIntensity: z
          .number()
          .min(0)
          .max(100)
          .describe("Relative intensity of grain/noise (0-100)"),
        halation: z.boolean().describe("Presence of halation/glow"),
        vignette: z
          .enum(["heavy", "moderate", "none", "subtle"])
          .describe("Vignette strength"),
      })
      .describe("Post-processing fingerprints beyond naming"),

    rhythm: z
      .object({
        cadence: z.string().describe("Perceived temporal cadence or pacing"),
        tempo: z.enum(["brisk", "frantic", "measured", "slow", "still"]),
      })
      .describe("Perceived motion energy in the frame"),

    styleLockPrompt: z
      .string()
      .describe(
        "One concise sentence that locks color, lighting, lens, grain, and emotion for prompts (prepend to prompts)"
      ),
  }),

  cinematicPotential: z.object({
    motionStyle: z
      .array(z.string())
      .min(2)
      .describe(
        "Types of motion that would fit: smooth, frenetic, slow, rhythmic, etc."
      ),

    camerawork: z
      .array(z.string())
      .min(2)
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
      .min(2)
      .describe(
        "Effects that would amplify the mood: light streaks, particles, etc."
      ),
  }),

  narrativeTone: z.object({
    cinematographer: z
      .string()
      .describe(
        "Cinematographer whose style this resembles (e.g., 'Roger Deakins', 'Emmanuel Lubezki', 'Hoyte van Hoytema')"
      ),

    director: z
      .string()
      .describe(
        "Director whose visual style this evokes (e.g., 'Denis Villeneuve', 'Wes Anderson', 'Christopher Nolan')"
      ),

    genre: z
      .array(z.string())
      .min(2)
      .describe(
        "Cinematic genres this evokes: thriller, fashion, experimental, etc. (at least 2)"
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

/** Type of structured analysis for image style and mood. */
export type ImageStyleMoodAnalysis = z.infer<
  typeof imageStyleMoodAnalysisSchema
>;
