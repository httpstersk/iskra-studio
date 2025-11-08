/**
 * B-roll Concept Generation API Route
 *
 * Generates contextually relevant B-roll concepts using OpenAI's structured output.
 */

import { createAuthenticatedHandler, requireEnv } from "@/lib/api/api-handler";
import { B_ROLL_GENERATION_SYSTEM_PROMPT } from "@/lib/b-roll-concept-generator";
import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const OPENAI_MODEL = "gpt-5";

/**
 * Request schema for B-roll concept generation
 */
const generateBRollRequestSchema = z.object({
  count: z.number().int().min(1).max(12),
  styleAnalysis: z.any() as z.ZodType<ImageStyleMoodAnalysis>,
  userContext: z.string().optional(),
});

/**
 * Schema for B-roll concept generation response.
 */
const bRollConceptSetSchema = z.object({
  concepts: z
    .array(z.string())
    .describe("Array of complete B-roll generation prompts"),
});

/**
 * POST handler for B-roll concept generation.
 *
 * Generates contextually relevant B-roll concepts based on image analysis.
 * Uses OpenAI's structured output for reliable JSON responses.
 */
export const POST = createAuthenticatedHandler({
  schema: generateBRollRequestSchema,
  handler: async (input) => {
    const { count, styleAnalysis, userContext } = input;

    // Validate API key
    requireEnv("OPENAI_API_KEY", "OpenAI API key");

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Build user message with context
    const userContextSection = userContext
      ? `\n\nUSER CONTEXT:\n${userContext}`
      : "";

    const userMessage = `
Generate ${count} B-roll concepts for the following reference image analysis:

SUBJECT:
- Type: ${styleAnalysis.subject.type}
- Description: ${styleAnalysis.subject.description}
- Context: ${styleAnalysis.subject.context}

COLOR PALETTE:
- Dominant Colors: ${styleAnalysis.colorPalette.dominant.join(", ")}
- Color Grading: ${styleAnalysis.colorPalette.grading}
- Saturation: ${styleAnalysis.colorPalette.saturation}
- Temperature: ${styleAnalysis.colorPalette.temperature}
- Mood: ${styleAnalysis.colorPalette.mood}

LIGHTING:
- Quality: ${styleAnalysis.lighting.quality}
- Direction: ${styleAnalysis.lighting.direction}
- Mood: ${styleAnalysis.lighting.mood}
- Atmosphere: ${styleAnalysis.lighting.atmosphere.join(", ")}

VISUAL STYLE:
- Aesthetic: ${styleAnalysis.visualStyle.aesthetic.join(", ")}
- Composition: ${styleAnalysis.visualStyle.composition}
- Depth: ${styleAnalysis.visualStyle.depth}
- Film Grain: ${styleAnalysis.visualStyle.filmGrain}
- Post-Processing Effects: ${styleAnalysis.visualStyle.postProcessing.join(", ")}
- Texture: ${styleAnalysis.visualStyle.texture.join(", ")}

MOOD:
- Primary: ${styleAnalysis.mood.primary}
- Secondary: ${styleAnalysis.mood.secondary.join(", ")}
- Energy: ${styleAnalysis.mood.energy}
- Atmosphere: ${styleAnalysis.mood.atmosphere}

STYLE SIGNATURE:
- Aspect Ratio: ${styleAnalysis.styleSignature.aspectRatio}
- Lens Language:
  - focalLengthMm: ${styleAnalysis.styleSignature.lensLanguage.focalLengthMm}
  - apertureF: ${styleAnalysis.styleSignature.lensLanguage.apertureF}
  - depthOfField: ${styleAnalysis.styleSignature.lensLanguage.depthOfField}
  - lensType: ${styleAnalysis.styleSignature.lensLanguage.lensType}
  - look: ${styleAnalysis.styleSignature.lensLanguage.look}
- Colorimetry:
  - brightness: ${styleAnalysis.styleSignature.colorimetry.brightness}
  - contrast: ${styleAnalysis.styleSignature.colorimetry.contrast}
  - harmony: ${styleAnalysis.styleSignature.colorimetry.harmony}
  - warmth: ${styleAnalysis.styleSignature.colorimetry.warmth}
  - highlightTint: ${styleAnalysis.styleSignature.colorimetry.highlightTint}
  - shadowTint: ${styleAnalysis.styleSignature.colorimetry.shadowTint}
  - saturation: ${styleAnalysis.styleSignature.colorimetry.saturation}
- Lighting Signature:
  - key: ${styleAnalysis.styleSignature.lightingSignature.key}
  - fill: ${styleAnalysis.styleSignature.lightingSignature.fill}
  - back: ${styleAnalysis.styleSignature.lightingSignature.back}
  - contrastRatio: ${styleAnalysis.styleSignature.lightingSignature.contrastRatio}
- Post-Processing Signature:
  - filmGrainIntensity: ${styleAnalysis.styleSignature.postProcessingSignature.filmGrainIntensity}
  - halation: ${styleAnalysis.styleSignature.postProcessingSignature.halation}
  - vignette: ${styleAnalysis.styleSignature.postProcessingSignature.vignette}
- Rhythm:
  - cadence: ${styleAnalysis.styleSignature.rhythm.cadence}
  - tempo: ${styleAnalysis.styleSignature.rhythm.tempo}
- Style Lock: "${styleAnalysis.styleSignature.styleLockPrompt}"

NARRATIVE TONE:
- Cinematographer Style: ${styleAnalysis.narrativeTone.cinematographer}
- Director Aesthetic: ${styleAnalysis.narrativeTone.director}
- Genre: ${styleAnalysis.narrativeTone.genre.join(", ")}
- Intensity: ${styleAnalysis.narrativeTone.intensity}/10
- Storytelling Approach: ${styleAnalysis.narrativeTone.storytellingApproach}${userContextSection}

CRITICAL: Generate ${count} diverse B-roll concepts that:
0. ABSOLUTE EXCLUSION: Never include any subjects or on-frame elements that appear in the reference image (main subject, body parts, clothing, props, signage/text/logos, or distinctive background elements)
1. Feature completely different scenes/objects/subjects than the reference
2. EXACTLY match the color grading: "${styleAnalysis.colorPalette.grading}"
3. EXACTLY match the lighting: ${styleAnalysis.lighting.quality} with ${styleAnalysis.lighting.direction}
4. EXACTLY match the film grain: ${styleAnalysis.visualStyle.filmGrain}
5. EXACTLY match ALL post-processing effects: ${styleAnalysis.visualStyle.postProcessing.join(", ")}
6. Apply ${styleAnalysis.narrativeTone.cinematographer}'s signature cinematography techniques
7. Follow ${styleAnalysis.narrativeTone.director}'s visual aesthetic and storytelling approach
8. Maintain IDENTICAL atmospheric qualities: ${styleAnalysis.lighting.atmosphere.join(", ")}
9. Preserve the ${styleAnalysis.mood.primary} mood with ${styleAnalysis.mood.energy} energy
10. EXACTLY match aspect ratio: ${styleAnalysis.styleSignature.aspectRatio}
11. EXACTLY match lens language (focal length, aperture, DoF, lens type, look)
12. EXACTLY match colorimetry values (brightness, contrast, harmony, warmth, highlight/shadow tint, saturation)
13. EXACTLY match lighting signature (key/fill/back and contrast ratio)
14. EXACTLY match post-processing signature (vignette level, halation presence, and film grain intensity ${styleAnalysis.styleSignature.postProcessingSignature.filmGrainIntensity})
15. EXACTLY match rhythm (cadence and tempo)
16. Start each B-roll prompt by PREPENDING this exact style lock sentence VERBATIM: "${styleAnalysis.styleSignature.styleLockPrompt}"
17. Include an explicit "Exclusions" clause in each prompt stating the omission (e.g., "without the reference subject", "no signage/text/logos")

In every technical aspect, each B-roll must look identical to the reference image — except for the subject/scene and any on-frame elements from the reference, which must be excluded from the generated output.
Include film grain and all post-processing effects explicitly in every prompt.
`;

    // Call OpenAI with structured output
    const completion = await openai.chat.completions.create({
      messages: [
        {
          content: B_ROLL_GENERATION_SYSTEM_PROMPT,
          role: "system",
        },
        {
          content: userMessage,
          role: "user",
        },
      ],
      model: OPENAI_MODEL,
      response_format: zodResponseFormat(
        bRollConceptSetSchema,
        "broll_concepts"
      ),
    });

    const messageContent = completion.choices[0]?.message?.content;

    if (!messageContent) {
      throw new Error("No content in OpenAI response");
    }

    return JSON.parse(messageContent);
  },
});
