/**
 * Standardized error response factory for API routes
 */

import { NextResponse } from "next/server";
import { AuthError } from "./auth-middleware";
import { HttpError } from "./http-client";

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: unknown,
  fallbackMessage = "Request failed"
): NextResponse {
  console.error("API Error:", error);

  // Handle known error types
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        ...(error.details && { details: error.details }),
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
    return NextResponse.json(
      {
        error: error.message,
        ...(error.response && { details: error.response }),
      },
      { status: error.status }
    );
  }

  // Handle generic errors
  const message = error instanceof Error ? error.message : fallbackMessage;
  return NextResponse.json(
    { error: message },
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
