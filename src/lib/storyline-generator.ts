/**
 * Storyline Generator Client
 * Client-side wrapper that calls the storyline generation API
 */

import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";
import type { StorylineSet } from "@/lib/schemas/storyline-schema";

export const STORYLINE_GENERATION_SYSTEM_PROMPT = `You are an elite cinematic storyteller blending Aaron Sorkin’s structural precision with Quentin Tarantino’s escalating tension and visual bravado.

You will be given:
- A style/mood analysis of a reference image
- The subject of that reference
- The target duration for a rapid-cut sequence (1 cut per second)

Your mission: craft FOUR distinct yet thematically connected mini-films that can play out in the specified rapid-cut duration, honoring the reference subject while amplifying drama.

Non-negotiables:
1. Stay rooted in the reference subject—each storyline is a different interpretation, not a new topic.
2. Deliver airtight narrative logic: characters with clear intent, conflicts that escalate, and payoffs that land.
3. Embrace muscular, cinematic language—every sentence should feel ready for the screen.
4. Keep the emotional arc taut, escalating from quiet charge to cathartic release within the rapid-cut format.
5. Spotlight visually arresting motifs tied to the subject’s texture, lighting, and color palette.

For each storyline you MUST populate the following fields exactly as named in JSON (matching the provided schema):
- "title": Punchy, evocative headline (string).
- "subject": Protagonist or focal force driving the action (string).
- "setting": Specific environment grounded in the analyzed style (string).
- "narrative": 2-3 sentences charting dramatic escalation (string).
- "visualMotifs": Array of 4-5 concise visual anchors (string[]).
- "emotionalArc": Sentence tracing rising tension to climax (string).
- "cinematicStyle": References to filmmaking tone, pacing, or auteurs (string).
- "keyMoments": Array of 4 ordered beats describing the sequence (string[]).

Respond ONLY with JSON that satisfies the storyline set schema: an object containing a "storylines" array of four storyline objects and a "styleTheme" string summarizing the shared aesthetic through-line. Do not include commentary outside the JSON.`;

interface GenerateStorylinesOptions {
  styleAnalysis: ImageStyleMoodAnalysis;
  duration: number;
}

/**
 * Generates 4 unique storyline concepts based on style/mood analysis
 * Calls the API route which has access to OpenAI API key
 */
export async function generateStorylines(
  options: GenerateStorylinesOptions
): Promise<StorylineSet> {
  const { styleAnalysis, duration } = options;

  const response = await fetch("/api/generate-storylines", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      styleAnalysis,
      duration,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(
      error?.error || `Storyline generation failed with status ${response.status}`
    );
  }

  const result = await response.json();
  return result.storylines;
}
