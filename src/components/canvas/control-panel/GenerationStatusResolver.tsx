/**
 * Generation Status Resolver
 *
 * Derives the current generation status message by examining active generation jobs.
 * Prioritizes earlier stages in the generation pipeline for display.
 */

import type {
  ActiveGeneration,
  ActiveVideoGeneration,
  GenerationStatus,
} from "@/types/canvas";

/**
 * Status priority order for determining which stage to display.
 * Earlier stages are shown first when multiple generations are in different states.
 */
const STATUS_PRIORITY: ReadonlyArray<GenerationStatus> = [
  "analyzing",
  "creating-storyline",
  "finalizing",
  "generating",
  "uploading",
] as const;

/**
 * Human-readable messages for each generation status.
 */
export const GENERATION_STATUS_MESSAGES: Readonly<
  Record<GenerationStatus, string>
> = {
  analyzing: "Analyzing Image",
  "creating-storyline": "Creating Storyline",
  finalizing: "Finalizing",
  generating: "Generating",
  uploading: "Uploading Image",
} as const;

/**
 * Default messages for generation states without specific status.
 */
const DEFAULT_MESSAGES = {
  DONE: "Done",
  PROCESSING: "Processing",
  VERB_GENERATING: "Generating",
  VARIATION_PLURAL: "variations",
  VARIATION_SINGULAR: "variation",
} as const;

interface ResolveStatusMessageParams {
  /** Map of active image generation jobs */
  activeGenerations?: Map<string, ActiveGeneration>;
  /** Total count of active image generations */
  activeGenerationsSize: number;
  /** Map of active video generation jobs */
  activeVideoGenerations?: Map<string, ActiveVideoGeneration>;
  /** Total count of active video generations */
  activeVideoGenerationsSize: number;
  /** Whether any generation is currently in progress */
  isGenerating: boolean;
  /** Optional override message */
  statusMessage?: string;
}

/**
 * Resolves the appropriate status message to display based on active generations.
 *
 * Priority logic:
 * 1. Use provided statusMessage if available
 * 2. Check for specific generation status (uploading, analyzing, etc.)
 * 3. Fall back to generic "Generating X variations" message
 *
 * @param params - Parameters for status resolution
 * @returns Human-readable status message
 */
export function resolveGenerationStatusMessage(
  params: ResolveStatusMessageParams,
): string {
  const {
    activeGenerations,
    activeGenerationsSize,
    activeVideoGenerations,
    activeVideoGenerationsSize,
    isGenerating,
    statusMessage,
  } = params;

  if (statusMessage) {
    return statusMessage;
  }

  const isVideoGeneration = activeVideoGenerationsSize > 0;
  const totalActive = activeGenerationsSize + activeVideoGenerationsSize;

  // Determine output type and variation count
  const noun = isVideoGeneration ? "video" : "image";
  const variationLabel =
    totalActive === 1
      ? DEFAULT_MESSAGES.VARIATION_SINGULAR
      : DEFAULT_MESSAGES.VARIATION_PLURAL;

  // Extract all active generations to check their status
  const allGenerations = isVideoGeneration
    ? Array.from(activeVideoGenerations?.values() || [])
    : Array.from(activeGenerations?.values() || []);

  // Find the most prominent status (prioritize earlier stages)
  const currentStatus = findPriorityStatus(allGenerations);

  // Return specific status message if found (but not for generic "generating")
  if (currentStatus && currentStatus !== "generating") {
    return GENERATION_STATUS_MESSAGES[currentStatus];
  }

  // Default to "Generating X variations"
  const verb =
    isGenerating || totalActive > 0
      ? DEFAULT_MESSAGES.VERB_GENERATING
      : DEFAULT_MESSAGES.PROCESSING;

  return `${verb} ${noun} ${variationLabel}`;
}

/**
 * Finds the highest priority status from a list of active generations.
 *
 * @param generations - Array of active generation configurations
 * @returns The highest priority status found, or null if none have status set
 */
function findPriorityStatus(
  generations: Array<ActiveGeneration | ActiveVideoGeneration>,
): GenerationStatus | null {
  for (const priorityStatus of STATUS_PRIORITY) {
    const hasStatus = generations.some((gen) => gen.status === priorityStatus);
    if (hasStatus) {
      return priorityStatus;
    }
  }
  return null;
}

/**
 * Resolves the success message to display when generation completes.
 *
 * @param successMessage - Optional custom success message
 * @returns Success message to display
 */
export function resolveSuccessMessage(successMessage?: string): string {
  return successMessage ?? DEFAULT_MESSAGES.DONE;
}
