/**
 * Sora 2 Prompt Generator - CINEMATIC BEAT FORMAT
 * Expands storyline concepts into structured Sora prompts following professional film format:
 * 1. Time-segmented narrative beats with labels (OPEN/HOOK, TRANSITION/BUILD, etc.)
 * 2. Detailed shot descriptions with camera work and transitions
 * 3. Visual cues & vibe section with technical specs and atmosphere
 *
 * Format matches professional film prompts used in production.
 */

import { logger } from "@/lib/logger";
import type { ImageStyleMoodAnalysis } from "@/lib/schemas/image-analysis-schema";
import type { StorylineConcept } from "@/lib/schemas/storyline-schema";

const log = logger.video;

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
 * Truncates prompt to fit within character limit while preserving structure
 * Progressively shortens beat descriptions until prompt fits
 */
function truncatePromptToLimit(beatSections: string[]): string {
  let prompt = beatSections.join("\n\n");
  
  // If already within limit, return as-is
  if (prompt.length <= PROMPT_CHAR_LIMIT) {
    return prompt;
  }

  // Calculate how much we need to reduce per beat
  const overhead = prompt.length - PROMPT_CHAR_LIMIT;
  const beatsCount = beatSections.length;
  const reductionPerBeat = Math.ceil(overhead / beatsCount) + 20; // Extra buffer

  // Parse and shorten each beat section
  const shortenedSections = beatSections.map((section) => {
    // Extract components: [timeSegment] — beatType\ndescription transition
    const lines = section.split("\n");
    if (lines.length !== 2) return section;

    const header = lines[0]; // [0–1.5s] — OPEN / HOOK
    const content = lines[1]; // description + transition

    // Find transition (usually after last period or at end)
    const transitionMatch = content.match(/(Cut:|Transition:)[^.]*.?$/);
    const transition = transitionMatch ? transitionMatch[0] : "";
    const description = transitionMatch
      ? content.slice(0, transitionMatch.index).trim()
      : content;

    // Calculate target length for description
    const currentDescLength = description.length;
    const targetDescLength = Math.max(
      80,
      currentDescLength - reductionPerBeat,
    );

    // Truncate description if needed
    const shortenedDesc =
      description.length > targetDescLength
        ? limitText(description, targetDescLength)
        : description;

    return `${header}\n${shortenedDesc}${transition ? " " + transition : ""}`;
  });

  prompt = shortenedSections.join("\n\n");

  // If still too long, more aggressive truncation
  if (prompt.length > PROMPT_CHAR_LIMIT) {
    return limitText(prompt, PROMPT_CHAR_LIMIT);
  }

  return prompt;
}

/**
 * Expands a single storyline concept into a cinematic Sora prompt
 * Follows professional film prompt format with time-segmented beats and visual cues
 * Enforces 1000 character limit to prevent API errors
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

  // Truncate to fit within limit
  const finalPrompt = truncatePromptToLimit(beatSections);

  // Log warning if truncation occurred
  const originalLength = beatSections.join("\n\n").length;
  if (originalLength > PROMPT_CHAR_LIMIT) {
    log.warn(`Prompt truncated from ${originalLength} to ${finalPrompt.length} characters to fit ${PROMPT_CHAR_LIMIT} char limit`);
  }

  return finalPrompt;
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
