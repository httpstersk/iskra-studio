/**
 * FAL Client Factory
 *
 * Centralized utility for creating FAL clients with proper key validation.
 * Eliminates duplication of getFalKey() and client creation logic.
 */

import { createFalClient, type FalClient } from "@fal-ai/client";

/**
 * Error thrown when FAL_KEY is not configured
 */
export class FalKeyError extends Error {
  constructor(message = "FAL_KEY environment variable is not configured") {
    super(message);
    this.name = "FalKeyError";
  }
}

/**
 * Validates and returns FAL_KEY environment variable
 *
 * @returns FAL API key
 * @throws FalKeyError if key is not configured or empty
 */
export function getFalKey(): string {
  const falKey = process.env.FAL_KEY;

  if (!falKey || !falKey.trim()) {
    throw new FalKeyError(
      "FAL_KEY environment variable is not configured. Get your API key from https://fal.ai/dashboard/keys",
    );
  }

  return falKey;
}

/**
 * Creates a FAL client with validated credentials
 *
 * @returns Configured FAL client
 * @throws FalKeyError if FAL_KEY is not configured
 *
 * @example
 * ```typescript
 * const client = createFalClientWithKey();
 * const result = await client.subscribe("model/endpoint", { input: {...} });
 * ```
 */
export function createFalClientWithKey(): FalClient {
  const falKey = getFalKey();

  return createFalClient({
    credentials: () => falKey,
  });
}
