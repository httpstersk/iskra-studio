/**
 * Sora 2 Prompt Generator - OPTIMIZED FOR API
 * Expands storyline concepts into full Sora prompts with 1 CUT PER SECOND
 * Prompts optimized for Sora API character limits (~800 chars max)
 */

import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";
import type { StorylineConcept } from "@/lib/schemas/storyline-schema";

interface PromptGenerationOptions {
  storyline: StorylineConcept;
  styleAnalysis: ImageStyleMoodAnalysis;
  duration: number;
}

const PROMPT_CHAR_LIMIT = 450;

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncatePrompt(value: string, limit: number = PROMPT_CHAR_LIMIT): string {
  if (value.length <= limit) return value;
  const sliced = value.slice(0, limit - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const safeSlice = lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced;
  return `${safeSlice.trim()}…`;
}

function joinList(values: string[], max: number, joiner: string): string {
  return values
    .filter(Boolean)
    .slice(0, max)
    .map(cleanText)
    .join(joiner);
}

/**
 * Expands a single storyline concept into a concise Sora-optimized prompt
 */
export function expandStorylineToPrompt(
  options: PromptGenerationOptions
): string {
  const { storyline, styleAnalysis, duration } = options;

  const narrative = cleanText(storyline.narrative);
  const setting = cleanText(storyline.setting);
  const palette = joinList(styleAnalysis.colorPalette.dominant, 2, " / ");
  const paletteMood = cleanText(styleAnalysis.colorPalette.mood);
  const lighting = cleanText(styleAnalysis.lighting.quality);
  const energy = cleanText(styleAnalysis.mood.primary);
  const beats = joinList(storyline.keyMoments, 3, " -> ")
    .replace(/\b(\d)(?:-?second)?\b/gi, "$1-second")
    .trim();
  const motifs = joinList(storyline.visualMotifs, 3, ", ");
  const cinematicStyle = cleanText(storyline.cinematicStyle);

  const segments = [
    narrative,
    setting,
    palette ? `Palette: ${palette} | ${paletteMood}` : "",
    `${lighting} lighting | ${energy} energy`,
    beats ? `Beats: ${beats}` : "",
    motifs ? `Visuals: ${motifs}` : "",
    `Style: ${cinematicStyle} | rapid ${duration}-second cuts | auteur-level intensity`,
  ].filter(Boolean);

  const rawPrompt = segments.map(cleanText).join(". ");
  return truncatePrompt(rawPrompt);
}

/**
 * Expands multiple storylines into Sora prompts
 */
export function expandStorylinesToPrompts(
  storylines: StorylineConcept[],
  styleAnalysis: ImageStyleMoodAnalysis,
  duration: number
): string[] {
  return storylines.map(storyline => 
    expandStorylineToPrompt({ storyline, styleAnalysis, duration })
  );
}


