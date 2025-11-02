/**
 * Adapter: Bria FIBO Structured Output → ImageStyleMoodAnalysis Schema
 *
 * Transforms FIBO's native JSON structure into our existing analysis format
 * to maintain backward compatibility with all downstream consumers.
 */

import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";

/**
 * Bria FIBO Structured Prompt Output Schema
 * Based on https://fal.ai/models/bria/fibo/generate/structured_prompt/api
 */
export interface FiboStructuredPrompt {
  short_description: string;
  objects: FiboObject[];
  background_setting: string;
  lighting: {
    conditions: string;
    direction: string;
    shadows: string;
  };
  aesthetics: {
    composition: string;
    color_scheme: string;
    mood_atmosphere: string;
    preference_score?: string;
    aesthetic_score?: string;
  };
  photographic_characteristics: {
    depth_of_field: string;
    focus: string;
    camera_angle: string;
    lens_focal_length: string;
  };
  style_medium: string;
  context: string;
  artistic_style: string;
}

export interface FiboObject {
  description: string;
  location: string;
  relationship: string;
  relative_size: string;
  shape_and_color: string;
  texture: string;
  appearance_details: string;
  number_of_objects?: number;
  pose?: string;
  expression?: string;
  clothing?: string;
  action?: string;
  gender?: string;
  skin_tone_and_texture?: string;
  orientation?: string;
}

/**
 * Extracts dominant colors from FIBO's color_scheme description
 */
function extractDominantColors(colorScheme: string): string[] {
  // Parse color descriptions from FIBO's text
  const colors: string[] = [];
  const colorPatterns = [
    /\b(red|blue|green|yellow|orange|purple|pink|brown|black|white|grey|gray|teal|indigo|amber|cobalt|crimson|emerald|gold|silver|navy|beige|tan|ivory|pearl)\b/gi,
  ];

  const matches = colorScheme.match(colorPatterns[0]) || [];
  const uniqueColors = [...new Set(matches.map((c) => c.toLowerCase()))];

  // Return at least 3 colors, pad with neutral tones if needed
  while (uniqueColors.length < 3) {
    if (uniqueColors.length === 0) uniqueColors.push("neutral grey");
    else if (uniqueColors.length === 1) uniqueColors.push("muted tone");
    else uniqueColors.push("ambient shadow");
  }

  return uniqueColors.slice(0, 5);
}

/**
 * Maps FIBO lighting conditions to our quality enum
 */
function mapLightingQuality(
  conditions: string
): "soft-diffused" | "hard-dramatic" | "natural" | "artificial" | "mixed" {
  const lower = conditions.toLowerCase();
  if (lower.includes("soft") || lower.includes("diffuse"))
    return "soft-diffused";
  if (lower.includes("hard") || lower.includes("dramatic"))
    return "hard-dramatic";
  if (
    lower.includes("natural") ||
    lower.includes("daylight") ||
    lower.includes("sunlight")
  )
    return "natural";
  if (
    lower.includes("artificial") ||
    lower.includes("studio") ||
    lower.includes("neon")
  )
    return "artificial";
  return "mixed";
}

/**
 * Maps FIBO depth of field to our depth enum
 */
function mapDepth(
  depthOfField: string
): "flat" | "layered" | "deep-perspective" {
  const lower = depthOfField.toLowerCase();
  if (lower.includes("shallow") || lower.includes("bokeh")) return "layered";
  if (lower.includes("deep") || lower.includes("wide"))
    return "deep-perspective";
  return "flat";
}

/**
 * Infers saturation from color scheme description
 */
function inferSaturation(
  colorScheme: string
): "muted" | "balanced" | "vibrant" | "hyper-saturated" {
  const lower = colorScheme.toLowerCase();
  if (
    lower.includes("desaturated") ||
    lower.includes("muted") ||
    lower.includes("grey")
  )
    return "muted";
  if (
    lower.includes("vibrant") ||
    lower.includes("vivid") ||
    lower.includes("rich")
  )
    return "vibrant";
  if (
    lower.includes("hyper") ||
    lower.includes("saturated") ||
    lower.includes("neon")
  )
    return "hyper-saturated";
  return "balanced";
}

/**
 * Infers temperature from color scheme
 */
function inferTemperature(
  colorScheme: string
): "cool" | "neutral" | "warm" | "mixed" {
  const lower = colorScheme.toLowerCase();
  const hasCool =
    lower.includes("blue") ||
    lower.includes("teal") ||
    lower.includes("cyan") ||
    lower.includes("cool");
  const hasWarm =
    lower.includes("orange") ||
    lower.includes("red") ||
    lower.includes("warm") ||
    lower.includes("amber");

  if (hasCool && hasWarm) return "mixed";
  if (hasCool) return "cool";
  if (hasWarm) return "warm";
  return "neutral";
}

/**
 * Infers energy level from mood atmosphere
 */
function inferEnergy(
  moodAtmosphere: string
): "calm" | "moderate" | "dynamic" | "explosive" {
  const lower = moodAtmosphere.toLowerCase();
  if (
    lower.includes("explosive") ||
    lower.includes("intense") ||
    lower.includes("chaotic")
  )
    return "explosive";
  if (
    lower.includes("dynamic") ||
    lower.includes("energetic") ||
    lower.includes("active")
  )
    return "dynamic";
  if (
    lower.includes("calm") ||
    lower.includes("peaceful") ||
    lower.includes("serene") ||
    lower.includes("still")
  )
    return "calm";
  return "moderate";
}

/**
 * Extracts focal length from FIBO's lens description
 */
function extractFocalLength(lensFocalLength: string): number {
  const match = lensFocalLength.match(/(\d+)mm/);
  if (match) return parseInt(match[1], 10);

  // Fallback based on description
  const lower = lensFocalLength.toLowerCase();
  if (
    lower.includes("wide") ||
    lower.includes("28mm") ||
    lower.includes("24mm")
  )
    return 28;
  if (
    lower.includes("standard") ||
    lower.includes("50mm") ||
    lower.includes("35mm")
  )
    return 50;
  if (lower.includes("portrait") || lower.includes("85mm")) return 85;
  if (lower.includes("telephoto") || lower.includes("135mm")) return 135;

  return 50; // Default to standard lens
}

/**
 * Infers aperture from depth of field
 */
function inferAperture(depthOfField: string): string {
  const lower = depthOfField.toLowerCase();
  if (lower.includes("shallow") || lower.includes("bokeh")) return "f/1.8";
  if (lower.includes("deep") || lower.includes("wide")) return "f/8";
  return "f/4";
}

/**
 * Creates a style lock prompt from FIBO data
 */
function generateStyleLockPrompt(fibo: FiboStructuredPrompt): string {
  const {
    aesthetics,
    photographic_characteristics,
    lighting,
    style_medium,
    artistic_style,
  } = fibo;

  return `${style_medium} in ${artistic_style} style, ${photographic_characteristics.lens_focal_length} lens with ${photographic_characteristics.depth_of_field} depth of field, ${aesthetics.color_scheme} color grading, ${lighting.conditions} ${lighting.direction} lighting, ${aesthetics.composition} composition`;
}

/**
 * Main adapter function: Transforms FIBO output to ImageStyleMoodAnalysis
 */
export function adaptFiboToAnalysis(
  fibo: FiboStructuredPrompt
): ImageStyleMoodAnalysis {
  const primaryObject = fibo.objects[0] || {
    description: "scene",
    shape_and_color: "neutral tones",
    texture: "smooth",
    location: "center",
    relationship: "primary subject",
    relative_size: "medium",
    appearance_details: "",
  };

  // Extract subject type from primary object or description
  const subjectType = primaryObject.description
    .split(",")[0]
    .toLowerCase()
    .includes("human")
    ? "person"
    : primaryObject.description.toLowerCase().includes("landscape")
      ? "landscape"
      : primaryObject.description.toLowerCase().includes("building")
        ? "architecture"
        : "object";

  const dominantColors = extractDominantColors(fibo.aesthetics.color_scheme);
  const saturation = inferSaturation(fibo.aesthetics.color_scheme);
  const temperature = inferTemperature(fibo.aesthetics.color_scheme);
  const energy = inferEnergy(fibo.aesthetics.mood_atmosphere);
  const focalLength = extractFocalLength(
    fibo.photographic_characteristics.lens_focal_length
  );

  return {
    subject: {
      type: subjectType,
      description: fibo.short_description,
      context: fibo.context,
    },

    colorPalette: {
      dominant: dominantColors,
      grading: fibo.aesthetics.color_scheme,
      mood: fibo.aesthetics.mood_atmosphere,
      saturation,
      temperature,
    },

    lighting: {
      quality: mapLightingQuality(fibo.lighting.conditions),
      direction: fibo.lighting.direction,
      mood: fibo.aesthetics.mood_atmosphere,
      atmosphere: [fibo.lighting.shadows, fibo.lighting.conditions],
    },

    visualStyle: {
      aesthetic: [fibo.artistic_style, fibo.style_medium],
      composition: fibo.aesthetics.composition,
      depth: mapDepth(fibo.photographic_characteristics.depth_of_field),
      filmGrain: "digital clean with subtle texture",
      postProcessing: ["natural color grading", "standard contrast"],
      texture: fibo.objects.map((obj) => obj.texture).filter(Boolean),
    },

    mood: {
      primary: fibo.aesthetics.mood_atmosphere.split(",")[0].trim(),
      secondary: fibo.aesthetics.mood_atmosphere
        .split(",")
        .slice(1, 3)
        .map((s) => s.trim())
        .filter(Boolean),
      energy,
      atmosphere: fibo.aesthetics.mood_atmosphere,
    },

    styleSignature: {
      aspectRatio: "16:9", // FIBO doesn't provide this, use default

      lensLanguage: {
        focalLengthMm: focalLength,
        apertureF: inferAperture(
          fibo.photographic_characteristics.depth_of_field
        ),
        depthOfField:
          mapDepth(fibo.photographic_characteristics.depth_of_field) ===
          "layered"
            ? "shallow"
            : mapDepth(fibo.photographic_characteristics.depth_of_field) ===
                "deep-perspective"
              ? "deep"
              : "medium",
        lensType: "spherical",
        look: fibo.photographic_characteristics.focus,
      },

      colorimetry: {
        brightness: "medium",
        contrast: "medium",
        harmony: "complementary",
        warmth: temperature,
        highlightTint: dominantColors[0] || "neutral",
        shadowTint: dominantColors[dominantColors.length - 1] || "neutral",
        saturation,
      },

      lightingSignature: {
        key: fibo.lighting.direction,
        fill: "ambient fill",
        back: "subtle separation",
        contrastRatio: "mid-key",
      },

      postProcessingSignature: {
        filmGrainIntensity: 10,
        halation: false,
        vignette: "subtle",
      },

      rhythm: {
        cadence: "measured pacing",
        tempo:
          energy === "calm"
            ? "still"
            : energy === "explosive"
              ? "frantic"
              : "measured",
      },

      emotionVector: {
        mystery: 50,
        tension: 40,
        serenity: 60,
        wonder: 55,
        melancholy: 30,
        nostalgia: 35,
        awe: 45,
        romance: 40,
      },

      styleLockPrompt: generateStyleLockPrompt(fibo),
    },

    cinematicPotential: {
      motionStyle: ["smooth", "measured"],
      camerawork: ["dolly", "pan"],
      editingPace: "measured",
      visualEffects: ["natural lighting", "depth blur"],
    },

    narrativeTone: {
      cinematographer: "Roger Deakins", // Generic fallback
      director: "Denis Villeneuve",
      genre: [fibo.artistic_style, fibo.style_medium],
      intensity: 6,
      storytellingApproach: fibo.context,
    },
  };
}
