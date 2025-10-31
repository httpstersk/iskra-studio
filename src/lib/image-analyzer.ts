/**
 * Shared Image Analysis Logic
 * Can be called directly from server-side code without HTTP requests
 */

import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";
import { imageStyleMoodAnalysisSchema } from "@/lib/schemas/image-analysis-schema";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";

export const IMAGE_STYLE_MOOD_PROMPT = `You are analyzing an image to extract structured data for cinematic video generation and narrative storyline sequences.

VISUAL COHERENCE FOCUS:
Your analysis will be used to generate visually coherent storyline sequences where multiple images must look like they were created by the same cinematographer in the same session.

Be EXTREMELY PRECISE with all measurements and characteristics:
- Use specific color values (not "blue" but "midnight indigo #1a2332" with hex codes when possible)
- Provide exact lighting angles (not "side light" but "45° side key from camera left")
- Specify measurable characteristics (not "grainy" but "35mm Kodak 5219 grain at ISO 800")
- Detail post-processing specifics (not "vignette" but "subtle corner vignette -0.3 stops")
- Include technical film terminology for precision

Provide a detailed analysis in the following categories. Be specific and creative with descriptive language. When lists are requested, ALWAYS supply at least the minimum number of items indicated.

⚠️ CRITICAL: Use exact lowercase field names as specified. Do NOT capitalize field names (use "mood" not "Mood", "quality" not "Quality", etc.)

SUBJECT/SCENE:
- Identify the main subject type (person, object, landscape, cityscape, abstract, nature, architecture, etc.)
- Describe what you see in 1-2 sentences
- Describe the general context or what's happening (e.g., "in contemplation", "in motion", "at rest")

COLOR PALETTE:
- List 3-5 dominant colors with evocative names AND estimated hex codes (e.g., "midnight indigo #1a2332", "electric cobalt #0056b3", "sunset amber #f4a261")
- Provide EXTREMELY detailed color grading description with technical specifics (e.g., "teal-orange blockbuster look with teal shadows at 180° hue, orange highlights at 30° hue, crushed blacks below 15 IRE", "desaturated Nordic noir palette with -40% global saturation, blue-grey cast at 210° hue")
- Describe the overall mood the colors create
- Saturation: choose ONLY ONE from these exact values: muted, balanced, vibrant, or hyper-saturated (no additional text)
- Temperature: choose ONLY ONE from these exact values: cool, neutral, warm, or mixed (no additional text)

LIGHTING:
- quality: choose ONLY ONE from these exact values: soft-diffused, hard-dramatic, natural, artificial, or mixed (do not add any additional text, just the enum value)
- direction: Provide PRECISE direction and characteristics with angles (e.g., "45° side key from camera left, 180° back rim at 2 stops over key, soft fill from camera right at -2 stops", "overhead key at 60° angle with ambient bounce fill")
- mood: Describe the emotional quality and mood of the lighting (note: lowercase 'mood')
- atmosphere: List atmospheric qualities with measurable details (e.g., "light haze reducing contrast by 20%", "volumetric god rays at 80° angle", "crystal clear with edge contrast", "diffuse overcast reducing shadows to 1:1 ratio")

IMPORTANT: All field names must be lowercase (quality, direction, mood, atmosphere)

VISUAL STYLE:
- List aesthetic styles (e.g., cinematic, editorial, surreal, minimalist, dramatic)
- Describe the compositional approach
- Depth: choose ONLY ONE from these exact values (no additional text):
  * "flat" = minimal depth separation, compressed perspective, everything on similar plane (telephoto compression, flat lighting, 2D feel)
  * "layered" = clear foreground/background separation with distinct planes (shallow DoF portraits, macro shots with bokeh, subject isolated from background)
  * "deep-perspective" = strong depth with multiple visible planes, wide-angle depth, or deep focus (wide establishing shots, deep focus cinematography)
- Film grain: Analyze grain characteristics with TECHNICAL PRECISION - specify stock type, ISO, and intensity (e.g., "35mm Kodak Vision3 5219 at ISO 800 with pronounced grain structure", "16mm Tri-X pushed 2 stops with heavy grain", "digital noise equivalent to ISO 3200", "Super 8 Ektachrome with fine grain at base ISO", "clean digital sensor at ISO 100 with minimal noise")
- Post-processing effects: List ALL visible effects with MEASURABLE PARAMETERS (e.g., "corner vignette at -0.8 stops with 30% feather", "bloom on highlights above 90% luminance", "lateral chromatic aberration 2px at frame edges", "barrel lens distortion 3%", "halation glow 15px radius on bright sources", "light leaks in top-left corner at 40% opacity")
- List textures present (e.g., rough, smooth, grainy, glossy)

MOOD & ATMOSPHERE:
- Primary emotional tone (one word or short phrase)
- List 2-4 secondary emotional layers
- Energy: choose ONLY ONE from these exact values: calm, moderate, dynamic, or explosive (no additional text)
- Describe the overall atmospheric feeling

STYLE SIGNATURE (precise fingerprint for exact matching):
- Aspect Ratio: choose ONLY ONE from these exact values: 1:1, 3:2, 4:3, 9:16, 16:9, 1.85:1, 2.39:1, or 21:9
- Lens Language: report all values
  - focalLengthMm (number): approximate 35mm-equivalent focal length (10-300)
  - apertureF (string): estimated aperture (e.g., f/1.8)
  - depthOfField: choose ONLY ONE: deep, medium, or shallow
  - lensType: choose ONLY ONE: anamorphic, spherical, or unknown
  - look (string): lens look characteristics (e.g., oval bokeh, barrel distortion, edge softness)
- Colorimetry: report all values
  - brightness: choose ONLY ONE: low, medium, or high
  - contrast: choose ONLY ONE: low, medium, or high
  - harmony: choose ONLY ONE: monochromatic, analogous, complementary, split-complementary, triadic, tetradic, or neutral
  - warmth: choose ONLY ONE: cool, neutral, warm, or mixed
  - highlightTint (string): highlight color cast
  - shadowTint (string): shadow color cast
  - saturation: choose ONLY ONE: muted, balanced, vibrant, or hyper-saturated
- Lighting Signature: report all values
  - key (string): key light characteristics
  - fill (string): fill light characteristics
  - back (string): back/rim light characteristics
  - contrastRatio: choose ONLY ONE: high-key, mid-key, low-key, or unknown
- Post-Processing Signature: report all values
  - filmGrainIntensity (0-100): numeric grain/noise intensity
  - halation (boolean): presence of halation/glow
  - vignette: choose ONLY ONE: none, subtle, moderate, or heavy
- Rhythm: report all values
  - cadence (string): perceived cadence/pacing
  - tempo: choose ONLY ONE: still, slow, measured, brisk, or frantic
- styleLockPrompt (string): ONE TECHNICAL SENTENCE encoding ALL critical visual parameters that MUST be prepended to every generation prompt to ensure perfect style matching. Include specific measurable values for: film stock/ISO, lens focal length & aperture, color grading specifics with LUT/preset names, lighting setup with angles & ratios, post-processing effects with parameters, and cinematographer/director references. Example: "Shot on 35mm Kodak Vision3 5219 at ISO 800, 85mm f/1.8 bokeh, teal-orange LUT with teal shadows at 180° hue & orange highlights at 30° hue, 45° side key with 3:1 fill ratio, corner vignette -0.8 stops, Roger Deakins/Denis Villeneuve aesthetic."

CINEMATIC POTENTIAL:
- List AT LEAST TWO motion styles that fit (e.g., smooth, frenetic, slow, rhythmic)
- List AT LEAST TWO camera techniques (e.g., push-in, orbit, tilt, dolly, pan)
- List AT LEAST TWO visual effects that would amplify the mood (e.g., light streaks, particles, bloom)
- Editing pace: choose ONLY ONE from these exact values: slow-contemplative, measured, fast-cuts, or rapid-fire (no additional text)

NARRATIVE TONE:
- Identify which cinematographer's style this most resembles (e.g., Roger Deakins, Emmanuel Lubezki, Hoyte van Hoytema, Vittorio Storaro, Bradford Young)
- Identify which director's visual aesthetic this evokes (e.g., Denis Villeneuve, Wes Anderson, Christopher Nolan, Wong Kar-wai, Terrence Malick)
- List 2-4 cinematic genres this evokes (e.g., thriller, fashion, experimental, noir, drama)
- Intensity level: number from 1 to 10
- Describe the storytelling approach

Focus on visual language, style, and mood that can inspire cinematic video sequences and storyline progressions. The cinematographer and director references will be used to guide generation that matches this exact aesthetic across multiple images in a narrative sequence. PRECISION IS CRITICAL for visual coherence.`;

export interface ImageAnalysisResult {
  analysis: ImageStyleMoodAnalysis;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

/**
 * Analyzes an image using OpenAI's vision model
 * This is the core logic that can be called directly from server-side code
 * @param imageUrl - Full URL of the image to analyze
 * @returns Promise resolving to image style and mood analysis
 */
export async function analyzeImageCore(
  imageUrl: string
): Promise<ImageAnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }

  if (!imageUrl || !imageUrl.trim()) {
    throw new Error("Image URL is required");
  }

  const result = await generateObject({
    model: openai("gpt-5"),
    schema: imageStyleMoodAnalysisSchema,
    messages: [
      {
        role: "system",
        content: IMAGE_STYLE_MOOD_PROMPT,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this image according to the structured format.",
          },
          { type: "image", image: imageUrl },
        ],
      },
    ],
  });

  return {
    analysis: result.object,
    usage: result.usage,
  };
}
