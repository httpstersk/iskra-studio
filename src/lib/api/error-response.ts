/**
 * Standardized error response factory for API routes
 */

import { NextResponse } from "next/server";
import { AuthError } from "./auth-middleware";
import { HttpError } from "./http-client";

const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: any,
    public isUserFacing: boolean = true
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Sanitize error message for production
 * Prevents leaking internal implementation details
 */
function sanitizeErrorMessage(
  error: unknown,
  fallbackMessage: string
): { message: string; details?: any } {
  // In development, show full error details
  if (IS_DEVELOPMENT) {
    if (error instanceof Error) {
      return {
        message: error.message,
        details: {
          name: error.name,
          stack: error.stack,
        },
      };
    }
    return { message: String(error) };
  }

  // In production, sanitize errors
  if (error instanceof ApiError && error.isUserFacing) {
    // Only return user-facing errors
    return { message: error.message };
  }

  if (error instanceof AuthError) {
    // Auth errors are safe to expose
    return { message: error.message };
  }

  if (error instanceof HttpError) {
    // Generic HTTP error message for production
    return { message: "An error occurred while processing your request" };
  }

  // Generic fallback for unknown errors
  return { message: fallbackMessage };
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: unknown,
  fallbackMessage = "Request failed"
): NextResponse {
  // Always log full error server-side
  console.error("API Error:", {
    error,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  });

  // Handle known error types
  if (error instanceof ApiError) {
    const sanitized = sanitizeErrorMessage(error, fallbackMessage);
    return NextResponse.json(
      {
        error: sanitized.message,
        ...(sanitized.details && { details: sanitized.details }),
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }

  if (error instanceof HttpError) {
    const sanitized = sanitizeErrorMessage(error, fallbackMessage);
    return NextResponse.json(
      { error: sanitized.message },
      { status: error.status }
    );
  }

  // Handle generic errors with sanitization
  const sanitized = sanitizeErrorMessage(error, fallbackMessage);
  return NextResponse.json(
    {
      error: sanitized.message,
      ...(sanitized.details && { details: sanitized.details }),
    },
    { status: 500 }
  );
}

/**
 * Parse error from fetch response
 */
export async function parseApiError(response: Response): Promise<never> {
  let errorMessage: string;
  let errorDetails: any;

  try {
    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      errorDetails = await response.json();
      errorMessage =
        errorDetails?.error ||
        errorDetails?.message ||
        `Request failed with status ${response.status}`;
    } else {
      const errorText = await response.text();
      errorMessage = errorText || `Request failed with status ${response.status}`;
      errorDetails = { text: errorText };
    }
  } catch {
    errorMessage = `Request failed with status ${response.status}`;
  }

  throw new ApiError(errorMessage, response.status, errorDetails);
}

/**
 * Wrap async API handler with error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<T>,
  errorMessage?: string
): Promise<T | NextResponse> {
  return handler().catch((error) => createErrorResponse(error, errorMessage));
}

/**
 * Create success response
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(data, { status });
}
