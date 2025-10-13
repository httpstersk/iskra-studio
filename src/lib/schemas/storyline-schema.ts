import { z } from "zod";

/**
 * Narrative beat types following cinematic story structure
 */
export const NARRATIVE_BEAT_TYPES = [
  "OPEN / HOOK",
  "TRANSITION / BUILD",
  "RUN / DEVELOPMENT",
  "IMPACT / REVEAL",
  "OUTRO / BUTTON",
] as const;

/**
 * Single narrative beat with timing, description, and transition
 */
export const narrativeBeatSchema = z.object({
  beatType: z
    .string()
    .describe("Beat type (e.g., 'OPEN / HOOK', 'TRANSITION / BUILD')"),

  description: z
    .string()
    .describe(
      "Detailed shot description including camera work, subject action, visual details (150-200 chars)"
    ),

  timeSegment: z
    .string()
    .describe(
      "Time range for this beat (e.g., '0–2s', '0–4s', '2–5s'). Varies based on pacing: slow cinema uses longer segments, high-intensity uses rapid cuts"
    ),

  transition: z
    .string()
    .describe(
      "Transition method to next beat (e.g., 'Cut: slow dissolve', 'Transition: crossfade dust flare', 'Cut: whip of dust')"
    ),
});

export const storylineConceptSchema = z.object({
  title: z.string().describe("Short evocative title for the storyline"),

  subject: z
    .string()
    .describe(
      "Main subject/character (e.g., 'female bounty hunter', 'street dancer', 'cyber warrior')"
    ),

  setting: z.string().describe("Environment/location where story takes place"),

  narrative: z
    .string()
    .describe("Brief 1-2 sentence story arc describing what happens"),

  cinematicStyle: z
    .string()
    .describe(
      "Overall cinematic approach with director/cinematographer influence (e.g., 'Leone + Storaro: operatic tension with bold shadows')"
    ),

  beats: z
    .array(narrativeBeatSchema)
    .length(5)
    .describe("Five narrative beats following cinematic story structure"),
});

export const storylineSetSchema = z.object({
  storylines: z
    .array(storylineConceptSchema)
    .length(4)
    .describe(
      "Four distinct storyline concepts matching the style/mood analysis"
    ),

  styleTheme: z
    .string()
    .describe("Common style thread that connects all four storylines"),
});

export type NarrativeBeat = z.infer<typeof narrativeBeatSchema>;
export type StorylineConcept = z.infer<typeof storylineConceptSchema>;
export type StorylineSet = z.infer<typeof storylineSetSchema>;
