/**
 * Typed Error Classes
 * Domain-specific error types for better error handling and debugging
 *
 * @module shared/errors/types
 */

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      context: this.context,
    };
  }
}

/**
 * Validation errors (400)
 */
export class ValidationError extends AppError {
  constructor(
    message: string,
    context?: Record<string, unknown>,
  ) {
    super(message, "VALIDATION_ERROR", 400, context);
  }
}

/**
 * Resource not found errors (404)
 */
export class NotFoundError extends AppError {
  constructor(
    message: string,
    context?: Record<string, unknown>,
  ) {
    super(message, "NOT_FOUND", 404, context);
  }
}

/**
 * Image generation/processing errors
 */
export class ImageGenerationError extends AppError {
  constructor(
    message: string,
    context?: Record<string, unknown>,
  ) {
    super(message, "IMAGE_GENERATION_ERROR", 500, context);
  }
}

/**
 * Image analysis errors
 */
export class ImageAnalysisError extends AppError {
  constructor(
    message: string,
    context?: Record<string, unknown>,
  ) {
    super(message, "IMAGE_ANALYSIS_ERROR", 500, context);
  }
}

/**
 * Storage/upload errors
 */
export class StorageError extends AppError {
  constructor(
    message: string,
    context?: Record<string, unknown>,
  ) {
    super(message, "STORAGE_ERROR", 500, context);
  }
}

/**
 * External API errors
 */
export class ExternalApiError extends AppError {
  constructor(
    message: string,
    public readonly service: string,
    context?: Record<string, unknown>,
  ) {
    super(message, "EXTERNAL_API_ERROR", 502, { ...context, service });
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Extract error message safely from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unknown error occurred";
}

/**
 * Extract status code from error
 */
export function getErrorStatusCode(error: unknown): number {
  if (isAppError(error)) {
    return error.statusCode;
  }
  return 500;
}
