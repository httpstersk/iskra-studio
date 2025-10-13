/**
 * Storyline Generation API Route
 * Generates dynamic storyline concepts based on style/mood analysis using AI SDK
 */

import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { storylineSetSchema } from "@/lib/schemas/storyline-schema";
import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";

export const maxDuration = 30;

const STORYLINE_GENERATION_PROMPT = `You are a visionary cinematographer and storytelling director creating HIGH-INTENSITY video concepts.

Based on the provided style/mood analysis and REFERENCE IMAGE SUBJECT, generate 4 DISTINCT storyline concepts that:
- Match the visual aesthetic and emotional tone of the reference
- Are THEMATICALLY RELATED to the reference subject (variations on the theme, not completely different topics)
- Have different specific narratives and settings while staying connected to the subject theme

CRITICAL REQUIREMENTS:
1. Each storyline must be UNIQUE but thematically connected to the reference subject
2. All storylines must match the analyzed style/mood (colors, lighting, energy, atmosphere)
3. Storylines should feel like variations/interpretations of the reference subject, not random different topics
4. Design for RAPID-CUT cinematography with 1 cut per second
5. Each storyline should escalate in intensity
6. Focus on visual storytelling - every moment must be visually striking
7. Vary the approaches: experimental, artistic, dramatic, abstract interpretations of the theme

INSPIRATION FOR VARIETY:
- Urban action: warriors, dancers, athletes in motion
- Fashion/editorial: models, designers, style icons
- Artistic: painters, sculptors, creators at work
- Experimental: abstract figures, surreal characters, dream sequences
- Nature: elemental forces, transformation, metamorphosis
- Technology: cyber beings, digital avatars, future humans

Each storyline should:
- Have a clear subject/character type
- Take place in a specific environment
- Include a brief narrative arc (what happens)
- List visual motifs that repeat throughout
- Describe the emotional progression
- Define key pivotal moments for the sequence

Make each storyline feel like a complete mini-film concept that could be shot in 4-10 seconds with rapid cuts.`;

interface GenerateStorylinesRequest {
  styleAnalysis: ImageStyleMoodAnalysis;
  duration: number;
}

/**
 * Builds a readable context string from style analysis
 */
function buildStyleContext(
  analysis: ImageStyleMoodAnalysis,
  duration: number
): string {
  const {
    subject,
    colorPalette,
    lighting,
    visualStyle,
    mood,
    cinematicPotential,
    narrativeTone,
  } = analysis;

  return `
REFERENCE IMAGE SUBJECT:
- Type: ${subject.type}
- Description: ${subject.description}
- Context: ${subject.context}

COLOR PALETTE:
- Dominant colors: ${colorPalette.dominant.join(", ")}
- Mood: ${colorPalette.mood}
- Saturation: ${colorPalette.saturation}
- Temperature: ${colorPalette.temperature}

LIGHTING:
- Quality: ${lighting.quality}
- Direction: ${lighting.direction}
- Mood: ${lighting.mood}
- Atmosphere: ${lighting.atmosphere.join(", ")}

VISUAL STYLE:
- Aesthetic: ${visualStyle.aesthetic.join(", ")}
- Texture: ${visualStyle.texture.join(", ")}
- Composition: ${visualStyle.composition}
- Depth: ${visualStyle.depth}

MOOD & ATMOSPHERE:
- Primary emotion: ${mood.primary}
- Secondary emotions: ${mood.secondary.join(", ")}
- Energy level: ${mood.energy}
- Atmosphere: ${mood.atmosphere}

CINEMATIC POTENTIAL:
- Motion styles: ${cinematicPotential.motionStyle.join(", ")}
- Camera techniques: ${cinematicPotential.camerawork.join(", ")}
- Editing pace: ${cinematicPotential.editingPace}
- Visual effects: ${cinematicPotential.visualEffects.join(", ")}

NARRATIVE TONE:
- Genres: ${narrativeTone.genre.join(", ")}
- Intensity: ${narrativeTone.intensity}/10
- Storytelling approach: ${narrativeTone.storytellingApproach}

DURATION: ${duration} seconds (${duration} rapid cuts at 1 cut per second)
`.trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateStorylinesRequest;
    const { styleAnalysis, duration } = body;

    if (!styleAnalysis) {
      return NextResponse.json(
        { error: "Style analysis is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const styleContext = buildStyleContext(styleAnalysis, duration || 4);

    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: storylineSetSchema,
      messages: [
        {
          role: "system",
          content: STORYLINE_GENERATION_PROMPT,
        },
        {
          role: "user",
          content: `Generate 4 unique storyline concepts for a ${duration || 4}-second rapid-cut video sequence.

STYLE/MOOD ANALYSIS:
${styleContext}

Create storylines that match this style but with completely different subjects and narratives. Make each one visually explosive and emotionally compelling.`,
        },
      ],
    });

    return NextResponse.json({
      storylines: result.object,
      usage: result.usage,
    });
  } catch (error) {
    console.error("Error generating storylines:", error);
    return NextResponse.json(
      {
        error: "Failed to generate storylines",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
