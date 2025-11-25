/**
 * API Handler Utilities
 *
 * Provides reusable patterns for API routes following DRY principles:
 * - Authentication checks
 * - Input validation with Zod
 * - Standardized error handling
 * - Type-safe request/response handling
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { type ZodSchema } from "zod";

/**
 * Standard error response format
 */
interface ErrorResponse {
  error: string;
  details?: unknown;
}

/**
 * Configuration for authenticated API handlers
 */
interface AuthenticatedHandlerConfig<TInput, TOutput> {
  /** Request body validation schema */
  schema: ZodSchema<TInput>;
  /** Handler function that processes the validated input */
  handler: (input: TInput, userId: string) => Promise<TOutput>;
}

/**
 * Configuration for public API handlers (no auth required)
 */
interface PublicHandlerConfig<TInput, TOutput> {
  /** Request body validation schema */
  schema: ZodSchema<TInput>;
  /** Handler function that processes the validated input */
  handler: (input: TInput) => Promise<TOutput>;
}

/**
 * Creates a type-safe authenticated API handler with validation.
 *
 * Handles:
 * - Authentication check
 * - Request body validation with Zod
 * - Standardized error responses
 * - Type-safe input/output
 *
 * @typeParam TInput - Validated input type from Zod schema
 * @typeParam TOutput - Handler return type
 * @param config - Handler configuration
 * @returns Next.js API route handler
 *
 * @example
 * ```typescript
 * export const POST = createAuthenticatedHandler({
 *   schema: z.object({
 *     imageUrl: z.string().url(),
 *     count: z.number().min(1).max(12),
 *   }),
 *   handler: async (input, userId) => {
 *     const result = await processImage(input.imageUrl);
 *     return { success: true, data: result };
 *   },
 * });
 * ```
 */
export function createAuthenticatedHandler<TInput, TOutput>(
  config: AuthenticatedHandlerConfig<TInput, TOutput>,
) {
  return async (
    req: Request,
  ): Promise<NextResponse<TOutput | ErrorResponse>> => {
    try {
      // Authenticate user
      const { userId } = await auth();

      if (!userId) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 },
        );
      }

      // Parse and validate request body
      const body = await req.json();
      const parseResult = config.schema.safeParse(body);

      if (!parseResult.success) {
        return NextResponse.json(
          { error: "Invalid request", details: parseResult.error.flatten() },
          { status: 400 },
        );
      }

      // Execute handler with validated input
      const result = await config.handler(parseResult.data, userId);

      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json(
        {
          error: "Request failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  };
}

/**
 * Creates a type-safe public API handler with validation (no auth required).
 *
 * Handles:
 * - Request body validation with Zod
 * - Standardized error responses
 * - Type-safe input/output
 *
 * @typeParam TInput - Validated input type from Zod schema
 * @typeParam TOutput - Handler return type
 * @param config - Handler configuration
 * @returns Next.js API route handler
 *
 * @example
 * ```typescript
 * export const POST = createPublicHandler({
 *   schema: z.object({
 *     query: z.string().min(1),
 *   }),
 *   handler: async (input) => {
 *     const results = await search(input.query);
 *     return { results };
 *   },
 * });
 * ```
 */
export function createPublicHandler<TInput, TOutput>(
  config: PublicHandlerConfig<TInput, TOutput>,
) {
  return async (
    req: Request,
  ): Promise<NextResponse<TOutput | ErrorResponse>> => {
    try {
      // Parse and validate request body
      const body = await req.json();
      const parseResult = config.schema.safeParse(body);

      if (!parseResult.success) {
        return NextResponse.json(
          { error: "Invalid request", details: parseResult.error.flatten() },
          { status: 400 },
        );
      }

      // Execute handler with validated input
      const result = await config.handler(parseResult.data);

      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json(
        {
          error: "Request failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  };
}

/**
 * Validates required environment variable.
 *
 * @param key - Environment variable key
 * @param name - Human-readable name for error messages
 * @returns Environment variable value
 * @throws Error if variable is not set
 *
 * @example
 * ```typescript
 * const apiKey = requireEnv("OPENAI_API_KEY", "OpenAI API key");
 * ```
 */
export function requireEnv(key: string, name: string): string {
  const value = process.env[key];

  if (!value || !value.trim()) {
    throw new Error(`${name} not configured`);
  }

  return value;
}

/**
 * Standard error messages for common scenarios
 */
export const ErrorMessages = {
  AUTHENTICATION_REQUIRED: "Authentication required",
  INVALID_REQUEST: "Invalid request",
  NOT_FOUND: "Resource not found",
  RATE_LIMIT_EXCEEDED: "Rate limit exceeded",
  SERVER_ERROR: "Internal server error",
} as const;
