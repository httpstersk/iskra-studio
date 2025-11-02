/**
 * Director-Style FIBO Prompt Refinement API Route
 *
 * Applies director-specific visual signatures to FIBO structured prompts.
 * Takes a FIBO analysis and refines it with "Make it look as if it were shot by {director}"
 * for each specified director.
 */

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fiboAnalysisSchema } from "@/lib/schemas/fibo-storyline-schema";

export const maxDuration = 30;

/**
 * Request schema
 */
const refineFiboDirectorPromptsRequestSchema = z.object({
  fiboAnalysis: fiboAnalysisSchema,
  directors: z.array(z.string()).min(1).max(12),
});

/**
 * System prompt for director style refinement
 */
const DIRECTOR_REFINEMENT_SYSTEM_PROMPT = `
You are a cinematography expert who transforms structured image prompts to match specific director visual signatures.

Your task: Given a FIBO structured analysis of an image and a director name, create a refined prompt that maintains the core content while applying that director's distinctive visual style.

DIRECTOR STYLE APPLICATION:
- Analyze the director's signature cinematography techniques
- Apply their color grading preferences
- Incorporate their typical lighting approaches
- Match their compositional signatures
- Preserve their characteristic mood and atmosphere

CRITICAL RULES:
1. MAINTAIN CORE CONTENT: Keep the same subject, objects, and setting
2. APPLY DIRECTOR STYLE: Infuse with director's visual signature
3. BE SPECIFIC: Use concrete cinematic terminology
4. STAY FOCUSED: One concise paragraph, no preamble
5. FORMAT: Return ONLY the refined prompt text, no explanations

EXAMPLES:

Input FIBO Analysis:
- Short description: "A solitary figure standing in doorway"
- Style: photograph, minimalist, high contrast
- Lighting: backlit from doorway, dramatic shadows

Director: Stanley Kubrick
Output: "A solitary figure standing in a doorway, framed with perfect symmetrical composition and one-point perspective. Shot with wide-angle lens creating geometric precision and unsettling spatial depth. High-contrast lighting with stark backlight from doorway creating clean silhouette against warm amber glow. Minimalist production design with every element meticulously placed. Cool clinical color palette with selective warm highlights. Kubrick's signature centered framing and architectural precision."

Director: Wong Kar-wai
Output: "A solitary figure standing in doorway, shot through layers of reflection and blur. Handheld camera with step-printed motion creating dreamy temporal distortion. Backlit by warm neon-saturated amber and teal color grading. Shallow focus with 28mm lens, frame bleeding with overexposed highlights and chromatic bloom. Moody atmospheric haze with cigarette smoke aesthetic. Wong Kar-wai's signature romantic melancholy through color and light."
`;

export async function POST(req: Request) {
  try {
    const parseResult = refineFiboDirectorPromptsRequestSchema.safeParse(
      await req.json(),
    );

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parseResult.error.flatten() },
        { status: 400 },
      );
    }

    const { fiboAnalysis, directors } = parseResult.data;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 },
      );
    }

    console.log(
      `[Director Refinement] Refining FIBO prompt for ${directors.length} directors...`,
    );

    // Build base prompt from FIBO analysis
    const baseDescription = buildBaseFiboDescription(fiboAnalysis);

    // Generate refined prompts for each director in parallel
    const refinementPromises = directors.map(async (director) => {
      const userPrompt = `
FIBO ANALYSIS:
${baseDescription}

DIRECTOR: ${director}

Generate a refined prompt that makes this image look as if it were shot by ${director}.
Return ONLY the refined prompt text.
`;

      const result = await generateText({
        model: openai("gpt-4o-mini"),
        messages: [
          {
            role: "system",
            content: DIRECTOR_REFINEMENT_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.7,
      });

      return {
        director,
        refinedPrompt: result.text.trim(),
      };
    });

    const refinedPrompts = await Promise.all(refinementPromises);

    console.log(
      `[Director Refinement] Generated ${refinedPrompts.length} refined prompts`,
    );

    return NextResponse.json({
      refinedPrompts,
    });
  } catch (error) {
    console.error("[Director Refinement] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to refine director prompts",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

/**
 * Builds a concise description from FIBO analysis for director refinement
 */
function buildBaseFiboDescription(
  fibo: z.infer<typeof fiboAnalysisSchema>,
): string {
  const {
    short_description,
    background_setting,
    lighting,
    aesthetics,
    photographic_characteristics,
    style_medium,
    artistic_style,
  } = fibo;

  return `
Description: ${short_description}
Setting: ${background_setting}
Style: ${style_medium}, ${artistic_style}
Composition: ${aesthetics.composition}
Color Scheme: ${aesthetics.color_scheme}
Mood: ${aesthetics.mood_atmosphere}
Lighting: ${lighting.conditions}, ${lighting.direction}, ${lighting.shadows}
Camera: ${photographic_characteristics.camera_angle}, ${photographic_characteristics.lens_focal_length}
Depth of Field: ${photographic_characteristics.depth_of_field}
Focus: ${photographic_characteristics.focus}
`.trim();
}
