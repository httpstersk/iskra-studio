/**
 * Error Handling Utilities
 * Centralized error handling and user-facing error messages
 *
 * @module shared/errors/handlers
 */

import { logger } from "../logging/logger";
import { getErrorMessage, getErrorStatusCode, isAppError } from "./types";

/**
 * Toast notification interface (compatible with shadcn/ui toast)
 */
export interface ToastNotification {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

/**
 * Convert an error to a user-facing toast notification
 */
export function errorToToast(error: unknown): ToastNotification {
  if (isAppError(error)) {
    return {
      title: "Error",
      description: error.message,
      variant: "destructive",
    };
  }

  const message = getErrorMessage(error);
  return {
    title: "Error",
    description: message,
    variant: "destructive",
  };
}

/**
 * Handle an error by logging it and optionally showing a toast
 */
export function handleError(
  error: unknown,
  options?: {
    context?: Record<string, unknown>;
    showToast?: (toast: ToastNotification) => void;
    operation?: string;
  },
): void {
  const message = options?.operation
    ? `${options.operation} failed`
    : "Operation failed";

  if (error instanceof Error) {
    logger.error(message, error, options?.context);
  } else {
    logger.error(message, undefined, {
      ...options?.context,
      error: String(error),
    });
  }

  if (options?.showToast) {
    options.showToast(errorToToast(error));
  }
}

/**
 * Convert error to API response format
 */
export function errorToApiResponse(error: unknown): {
  error: string;
  code?: string;
  statusCode: number;
  context?: Record<string, unknown>;
} {
  if (isAppError(error)) {
    return {
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
      context: error.context,
    };
  }

  return {
    error: getErrorMessage(error),
    statusCode: getErrorStatusCode(error),
  };
}

/**
 * Wrap an async operation with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  options?: {
    context?: Record<string, unknown>;
    onError?: (error: unknown) => void;
    operationName?: string;
  },
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    handleError(error, {
      context: options?.context,
      operation: options?.operationName,
    });
    options?.onError?.(error);
    return null;
  }
}
