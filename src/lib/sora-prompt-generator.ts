/**
 * Sora 2 Prompt Generator - CINEMATIC FORMAT
 * Expands storyline concepts into structured Sora prompts following cinematic guidelines:
 * 1. Global descriptors (Setting, Subject, Lighting, Vibe)
 * 2. Timestamps [00:00-00:01] for each shot
 * 3. Explicit shot types and camera motion
 * 4. SFX: and VFX: labels
 * 
 * All prompts naturally fit within 1000 chars by design (no truncation needed)
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

/**
 * Limits text to max length, cutting at word boundary
 */
function limitText(text: string, maxLength: number): string {
  const cleaned = cleanText(text);
  if (cleaned.length <= maxLength) return cleaned;
  
  const sliced = cleaned.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(" ");
  return lastSpace > 0 ? sliced.slice(0, lastSpace) : sliced;
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
 * Structured to naturally fit within 1000 chars:
 * - Global descriptors: ~200 chars
 * - 4 shots × 140 chars each: ~560 chars
 * - Formatting overhead: ~40 chars
 * - Total: ~800 chars (safe margin under 1000)
 */
export function expandStorylineToPrompt(
  options: PromptGenerationOptions
): string {
  const { storyline, styleAnalysis } = options;

  // Global descriptors (target: ~200 chars total)
  const setting = limitText(storyline.setting, 40);
  const subject = limitText(storyline.subject, 20);
  const lighting = limitText(styleAnalysis.lighting.quality, 20);
  const vibe = limitText(styleAnalysis.mood.primary, 20);
  const cinematography = limitText(storyline.cinematicStyle, 80);

  const globalDesc = `Setting: ${setting}. Subject: ${subject}. Lighting: ${lighting}. Vibe: ${vibe}. Cinematography: ${cinematography}.`;

  // Timestamp-based shots (target: ~140 chars each)
  const moments = storyline.keyMoments.slice(0, 4);
  const shots: string[] = [];

  for (let i = 0; i < moments.length; i++) {
    const startSec = i;
    const endSec = i + 1;
    const timestamp = formatTimestamp(startSec, endSec);
    const momentDesc = limitText(moments[i], 140);
    shots.push(`${timestamp} ${momentDesc}`);
  }

  const fullPrompt = `${globalDesc} ${shots.join(" ")}`;
  
  // Safety check: should never hit this if input follows guidelines
  if (fullPrompt.length > PROMPT_CHAR_LIMIT) {
    console.warn(`Prompt exceeded ${PROMPT_CHAR_LIMIT} chars: ${fullPrompt.length} chars`);
  }
  
  return fullPrompt;
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
