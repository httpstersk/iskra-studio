/**
 * B-roll Concept Generation API Route
 * 
 * Generates contextually relevant B-roll concepts using OpenAI's structured output.
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import { B_ROLL_GENERATION_SYSTEM_PROMPT } from "@/lib/b-roll-concept-generator";
import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";

const OPENAI_MODEL = "gpt-4o-2024-08-06";

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
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { count, styleAnalysis, userContext } = body as {
      count: number;
      styleAnalysis: ImageStyleMoodAnalysis;
      userContext?: string;
    };

    // Validate inputs
    if (!count || count < 1 || count > 12) {
      return NextResponse.json(
        { error: "Count must be between 1 and 12" },
        { status: 400 }
      );
    }

    if (!styleAnalysis) {
      return NextResponse.json(
        { error: "Style analysis is required" },
        { status: 400 }
      );
    }

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
- Texture: ${styleAnalysis.visualStyle.texture.join(", ")}
- Composition: ${styleAnalysis.visualStyle.composition}
- Depth: ${styleAnalysis.visualStyle.depth}

MOOD:
- Primary: ${styleAnalysis.mood.primary}
- Secondary: ${styleAnalysis.mood.secondary.join(", ")}
- Energy: ${styleAnalysis.mood.energy}
- Atmosphere: ${styleAnalysis.mood.atmosphere}

NARRATIVE TONE:
- Genre: ${styleAnalysis.narrativeTone.genre.join(", ")}
- Intensity: ${styleAnalysis.narrativeTone.intensity}/10
- Storytelling Approach: ${styleAnalysis.narrativeTone.storytellingApproach}${userContextSection}

Generate ${count} diverse B-roll concepts that complement this reference while featuring completely different scenes/objects/subjects.
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
      response_format: zodResponseFormat(bRollConceptSetSchema, "broll_concepts"),
      temperature: 0.8, // Higher temperature for creative variety
    });

    const messageContent = completion.choices[0]?.message?.content;

    if (!messageContent) {
      throw new Error("No content in OpenAI response");
    }

    const result = JSON.parse(messageContent);

    return NextResponse.json(result);
  } catch (error) {
    console.error("B-roll concept generation error:", error);

    return NextResponse.json(
      {
        error: "B-roll concept generation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
