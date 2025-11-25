/**
 * Standardized event tracking utilities for tRPC streaming subscriptions.
 *
 * @remarks
 * These helpers provide consistent event tracking patterns across all
 * subscription-based procedures, reducing duplication and ensuring
 * uniform event structures.
 */

import { tracked } from "@trpc/server";

/**
 * Base event structure that all events extend from.
 */
interface BaseEvent {
  type: string;
  [key: string]: unknown;
}

/**
 * Progress event data.
 */
export interface ProgressEvent {
  type: "progress";
  progress: number;
  status: string;
}

/**
 * Completion event data.
 */
export interface CompletionEvent {
  type: "complete";
  [key: string]: unknown;
}

/**
 * Error event data.
 */
export interface ErrorEvent {
  type: "error";
  error: string;
}

/**
 * Generates a unique generation ID for tracking a single operation.
 *
 * @param prefix - Optional prefix for the ID (default: "gen")
 * @returns A unique generation ID string
 */
export function generateId(prefix: string = "gen"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Creates a tracked progress event.
 *
 * @param generationId - The unique ID for this generation
 * @param progress - Progress percentage (0-100)
 * @param status - Human-readable status message
 * @param suffix - Optional suffix for the event ID (default: "progress")
 * @returns A tracked progress event
 */
export function yieldProgress(
  generationId: string,
  progress: number,
  status: string,
  suffix: string = "progress",
) {
  return tracked(`${generationId}_${suffix}`, {
    type: "progress",
    progress,
    status,
  } as ProgressEvent);
}

/**
 * Creates a tracked completion event.
 *
 * @param generationId - The unique ID for this generation
 * @param data - Additional completion data
 * @returns A tracked completion event
 */
export function yieldComplete(
  generationId: string,
  data: Omit<CompletionEvent, "type">,
) {
  return tracked(`${generationId}_complete`, {
    type: "complete",
    ...data,
  } as CompletionEvent);
}

/**
 * Creates a tracked error event.
 *
 * @param generationId - The unique ID for this generation (or use Date.now() for generic errors)
 * @param error - Error message or Error object
 * @param suffix - Optional suffix for the event ID (default: "error")
 * @returns A tracked error event
 */
export function yieldError(
  generationId: string,
  error: string | Error,
  suffix: string = "error",
) {
  const errorMessage = error instanceof Error ? error.message : error;
  return tracked(`${generationId}_${suffix}`, {
    type: "error",
    error: errorMessage,
  } as ErrorEvent);
}

/**
 * Creates a tracked error event with a timestamp-based ID.
 * Useful for catch blocks where the generation ID may not be available.
 *
 * @param error - Error message or Error object
 * @returns A tracked error event
 */
export function yieldTimestampedError(error: string | Error) {
  return yieldError(`error_${Date.now()}`, error, "");
}

/**
 * Creates a tracked custom event.
 *
 * @param eventId - The full event ID
 * @param data - Event data
 * @returns A tracked custom event
 */
export function yieldCustom(eventId: string, data: BaseEvent) {
  return tracked(eventId, data);
}
