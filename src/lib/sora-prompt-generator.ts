/**
 * Sora 2 Prompt Generator - CINEMATIC FORMAT
 * Expands storyline concepts into structured Sora prompts following cinematic guidelines:
 * 1. Global descriptors (Setting, Subject, Lighting, Vibe)
 * 2. Timestamps [00:00-00:01] for each shot
 * 3. Explicit shot types and camera motion
 * 4. SFX: and VFX: labels
 */

import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";
import type { StorylineConcept } from "@/lib/schemas/storyline-schema";

interface PromptGenerationOptions {
  storyline: StorylineConcept;
  styleAnalysis: ImageStyleMoodAnalysis;
  duration: number;
}

const PROMPT_CHAR_LIMIT = 1000;

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function truncatePrompt(
  value: string,
  limit: number = PROMPT_CHAR_LIMIT
): string {
  if (value.length <= limit) return value;
  const sliced = value.slice(0, limit - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const safeSlice = lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced;
  return `${safeSlice.trim()}…`;
}

/**
 * Formats timestamp in [MM:SS-MM:SS] format
 */
function formatTimestamp(startSec: number, endSec: number): string {
  const formatTime = (sec: number) => {
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return `[${formatTime(startSec)}-${formatTime(endSec)}]`;
}

/**
 * Expands a single storyline concept into a cinematic Sora prompt
 */
export function expandStorylineToPrompt(
  options: PromptGenerationOptions
): string {
  const { storyline, styleAnalysis, duration } = options;

  // 1. Global descriptors
  const setting = cleanText(storyline.setting);
  const subject = cleanText(storyline.subject);
  const lighting = cleanText(styleAnalysis.lighting.quality);
  const vibe = cleanText(styleAnalysis.mood.primary);
  const cinematography = cleanText(storyline.cinematicStyle);

  const globalDesc = `Setting: ${setting}. Subject: ${subject}. Lighting: ${lighting}. Vibe: ${vibe}. Cinematography: ${cinematography}.`;

  // 2. Timestamp-based shots from keyMoments
  const moments = storyline.keyMoments.slice(0, 4);
  const shots: string[] = [];

  for (let i = 0; i < moments.length; i++) {
    const startSec = i;
    const endSec = i + 1;
    const timestamp = formatTimestamp(startSec, endSec);
    const momentDesc = cleanText(moments[i]);
    shots.push(`${timestamp} ${momentDesc}`);
  }

  const fullPrompt = `${globalDesc} ${shots.join(" ")}`;
  return truncatePrompt(fullPrompt);
}

/**
 * Expands multiple storylines into Sora prompts
 */
export function expandStorylinesToPrompts(
  storylines: StorylineConcept[],
  styleAnalysis: ImageStyleMoodAnalysis,
  duration: number
): string[] {
  return storylines.map((storyline) =>
    expandStorylineToPrompt({ storyline, styleAnalysis, duration })
  );
}
