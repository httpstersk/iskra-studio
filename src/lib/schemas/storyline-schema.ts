import { z } from "zod";

export const storylineConceptSchema = z.object({
  title: z.string().describe("Short evocative title for the storyline"),

  subject: z
    .string()
    .describe(
      "Main subject/character (e.g., 'street dancer', 'cyber warrior', 'fashion icon')"
    ),

  setting: z.string().describe("Environment/location where story takes place"),

  narrative: z
    .string()
    .describe("Brief 1-2 sentence story arc describing what happens"),

  visualMotifs: z
    .array(z.string())
    .describe(
      "3-5 key visual elements that appear throughout (e.g., 'neon reflections', 'fabric motion', 'light trails')"
    ),

  emotionalArc: z
    .string()
    .describe("How the emotional intensity builds across the cuts"),

  cinematicStyle: z
    .string()
    .describe(
      "Overall cinematic approach (e.g., 'commercial high-energy', 'surreal dreamlike', 'editorial fashion', 'experimental time-based')"
    ),

  keyMoments: z
    .array(z.string())
    .describe("4-6 pivotal moments/beats in the sequence"),
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

export type StorylineConcept = z.infer<typeof storylineConceptSchema>;
export type StorylineSet = z.infer<typeof storylineSetSchema>;
