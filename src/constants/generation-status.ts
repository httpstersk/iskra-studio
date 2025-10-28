/**
 * Generation Status Constants
 * 
 * Centralized constants for generation status tracking and management.
 * Used across handlers to maintain consistent status updates.
 */

import type { GenerationStatus } from "@/types/canvas";

/**
 * Status values for generation processes.
 * These should be used when setting the status field on ActiveGeneration or ActiveVideoGeneration.
 */
/**
 * Generation status values mapped to uppercase constant names.
 * Note: "creating-storyline" uses hyphen in the key to match TypeScript constant naming.
 */
export const GENERATION_STATUS = {
  ANALYZING: "analyzing",
  "CREATING-STORYLINE": "creating-storyline",
  FINALIZING: "finalizing",
  GENERATING: "generating",
  UPLOADING: "uploading",
} as const satisfies Readonly<Record<string, GenerationStatus>>;

/**
 * Placeholder identifier prefixes for temporary generation status tracking.
 * Used to create unique IDs for status tracking during different stages.
 */
export const STATUS_PLACEHOLDER_PREFIX = {
  ANALYZE_IMAGE: "analyze",
  ANALYZE_VIDEO: "video-analyze",
  CREATE_STORYLINE: "storyline",
  UPLOAD_IMAGE: "upload",
  UPLOAD_VIDEO: "video-upload",
} as const;

/**
 * Creates a unique placeholder ID for status tracking.
 * 
 * @param prefix - Type of placeholder (upload, analyze, etc.)
 * @param timestamp - Unique timestamp for this generation batch
 * @returns Unique placeholder ID
 */
export function createStatusPlaceholderId(
  prefix: keyof typeof STATUS_PLACEHOLDER_PREFIX,
  timestamp: number
): string {
  return `variation-${timestamp}-${STATUS_PLACEHOLDER_PREFIX[prefix]}`;
}
