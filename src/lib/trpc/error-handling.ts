/**
 * Error handling utilities for tRPC procedures.
 *
 * @remarks
 * These utilities provide consistent error handling patterns, including
 * error message extraction, transformation, and standardized error responses.
 */

import { extractFalErrorMessage } from "@/lib/fal/helpers";
import { yieldTimestampedError } from "./event-tracking";

/**
 * Common error types for generation procedures.
 */
export enum GenerationErrorType {
  VALIDATION = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  GENERATION_FAILED = "GENERATION_FAILED",
  API_ERROR = "API_ERROR",
  TIMEOUT = "TIMEOUT",
  UNKNOWN = "UNKNOWN_ERROR",
}

/**
 * Extracts a user-friendly error message from any error type.
 *
 * @param error - The error to extract a message from
 * @param fallbackMessage - Default message if extraction fails
 * @returns A user-friendly error message
 */
export function extractErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

/**
 * Creates a standardized error with type classification.
 *
 * @param message - Error message
 * @param type - Error type classification
 * @returns Error object with type property
 */
export function createTypedError(
  message: string,
  type: GenerationErrorType = GenerationErrorType.UNKNOWN,
): Error & { type: GenerationErrorType } {
  const error = new Error(message) as Error & { type: GenerationErrorType };
  error.type = type;
  return error;
}

/**
 * Wraps a generator function with standardized error handling.
 * Automatically catches errors and yields timestamped error events.
 *
 * @param generator - The generator function to wrap
 * @param fallbackMessage - Fallback error message
 * @returns Wrapped generator with error handling
 */
export async function* withErrorHandling<T>(
  generator: AsyncGenerator<T, void, unknown>,
  fallbackMessage: string,
): AsyncGenerator<T, void, unknown> {
  try {
    yield* generator;
  } catch (error) {
    yield yieldTimestampedError(
      extractFalErrorMessage(error, fallbackMessage),
    ) as T;
  }
}

/**
 * Handles FAL API errors specifically, wrapping them with context.
 *
 * @param error - The error from FAL API
 * @param context - Context message (e.g., "Failed to generate image")
 * @returns Tracked error event
 */
export function handleFalError(error: unknown, context: string) {
  return yieldTimestampedError(extractFalErrorMessage(error, context));
}

/**
 * Validates that a required result is present, throwing if not.
 *
 * @param result - The result to validate
 * @param errorMessage - Error message if result is missing
 * @returns The validated result
 * @throws Error if result is null or undefined
 */
export function assertResultPresent<T>(
  result: T | null | undefined,
  errorMessage: string,
): T {
  if (result === null || result === undefined) {
    throw createTypedError(errorMessage, GenerationErrorType.GENERATION_FAILED);
  }
  return result;
}

/**
 * Safely executes an async operation with error transformation.
 *
 * @param operation - The async operation to execute
 * @param errorContext - Context for error messages
 * @returns Result or Error
 */
export async function safeExecute<T>(
  operation: () => Promise<T>,
  errorContext: string,
): Promise<T | Error> {
  try {
    return await operation();
  } catch (error) {
    return new Error(extractFalErrorMessage(error, errorContext));
  }
}

/**
 * Wraps a mutation function with standardized error handling.
 *
 * @param fn - The mutation function to wrap
 * @param errorContext - Context for error messages
 * @returns Wrapped function with error handling
 */
export function withMutationErrorHandling<TInput, TOutput>(
  fn: (input: TInput) => Promise<TOutput>,
  errorContext: string,
): (input: TInput) => Promise<TOutput> {
  return async (input: TInput) => {
    try {
      return await fn(input);
    } catch (error) {
      throw new Error(extractFalErrorMessage(error, errorContext));
    }
  };
}
