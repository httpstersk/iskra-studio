/**
 * Sora 2 Prompt Generator - CINEMATIC BEAT FORMAT
 * Expands storyline concepts into structured Sora prompts following professional film format:
 * 1. Time-segmented narrative beats with labels (OPEN/HOOK, TRANSITION/BUILD, etc.)
 * 2. Detailed shot descriptions with camera work and transitions
 * 3. Visual cues & vibe section with technical specs and atmosphere
 *
 * Format matches professional film prompts used in production.
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
 * Formats a narrative beat into cinematic prompt format
 * Example: [0–2s] — OPEN / HOOK\nExtreme close-up on...
 */
function formatBeat(
  beatType: string,
  description: string,
  timeSegment: string,
  transition: string,
): string {
  return `[${timeSegment}] — ${beatType}\n${description} ${transition}`;
}

/**
 * Expands a single storyline concept into a cinematic Sora prompt
 * Follows professional film prompt format with time-segmented beats and visual cues
 */
export function expandStorylineToPrompt(
  options: PromptGenerationOptions,
): string {
  const { storyline } = options;

  // Format narrative beats
  const beatSections = storyline.beats.map((beat) =>
    formatBeat(
      beat.beatType,
      cleanText(beat.description),
      beat.timeSegment,
      cleanText(beat.transition),
    ),
  );

  const fullPrompt = beatSections.join("\n\n");

  // Safety check: should never hit this if input follows guidelines
  if (fullPrompt.length > PROMPT_CHAR_LIMIT) {
    console.warn(
      `Prompt exceeded ${PROMPT_CHAR_LIMIT} chars: ${fullPrompt.length} chars`,
    );
  }

  return fullPrompt;
}

/**
 * Expands multiple storylines into Sora prompts
 */
export function expandStorylinesToPrompts(
  storylines: StorylineConcept[],
  styleAnalysis: ImageStyleMoodAnalysis,
  duration: number,
): string[] {
  return storylines.map((storyline) =>
    expandStorylineToPrompt({ storyline, styleAnalysis, duration }),
  );
}
