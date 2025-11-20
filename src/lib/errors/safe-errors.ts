/**
 * Safe Errors - Lightweight errors-as-values API using @safe-std/error
 *
 * This module provides custom error types and utilities for the errors-as-values pattern.
 * It replaces try-catch blocks with explicit error returns for better type safety and performance.
 */

import * as st from '@safe-std/error';

// ============================================================================
// Custom Error Types
// ============================================================================

/**
 * HTTP Error - for API requests and fetch operations
 */
declare const httpErrSymbol: unique symbol;

export interface HttpErrPayload {
  status: number;
  message: string;
  response?: unknown;
}

export class HttpErr extends st.Err<HttpErrPayload> {
  [httpErrSymbol]: null = null;
}

/**
 * Bria API Error - for Bria-specific API failures
 */
declare const briaApiErrSymbol: unique symbol;

export interface BriaApiErrPayload {
  message: string;
  statusCode?: number;
  requestId?: string;
  cause?: unknown;
}

export class BriaApiErr extends st.Err<BriaApiErrPayload> {
  [briaApiErrSymbol]: null = null;
}

/**
 * Bria Token Error - when API token is missing/invalid
 */
declare const briaTokenErrSymbol: unique symbol;

export interface BriaTokenErrPayload {
  message: string;
}

export class BriaTokenErr extends st.Err<BriaTokenErrPayload> {
  [briaTokenErrSymbol]: null = null;
}

/**
 * Storage Error - for file/storage operations
 */
declare const storageErrSymbol: unique symbol;

export interface StorageErrPayload {
  message: string;
  operation: 'upload' | 'download' | 'delete' | 'read' | 'write';
  cause?: unknown;
}

export class StorageErr extends st.Err<StorageErrPayload> {
  [storageErrSymbol]: null = null;
}

/**
 * Quota Error - for quota-related failures
 */
declare const quotaErrSymbol: unique symbol;

export interface QuotaErrPayload {
  message: string;
  required: number;
  available: number;
}

export class QuotaErr extends st.Err<QuotaErrPayload> {
  [quotaErrSymbol]: null = null;
}

/**
 * Validation Error - for input validation failures
 */
declare const validationErrSymbol: unique symbol;

export interface ValidationErrPayload {
  message: string;
  field?: string;
}

export class ValidationErr extends st.Err<ValidationErrPayload> {
  [validationErrSymbol]: null = null;
}

/**
 * FIBO Analysis Error - for image analysis failures
 */
declare const fiboAnalysisErrSymbol: unique symbol;

export interface FiboAnalysisErrPayload {
  message: string;
  cause?: unknown;
}

export class FiboAnalysisErr extends st.Err<FiboAnalysisErrPayload> {
  [fiboAnalysisErrSymbol]: null = null;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Wraps a promise to return error values instead of throwing
 *
 * @example
 * const response = await tryPromise(fetch('http://example.com'));
 * if (st.isErr(response)) {
 *   console.error(response.payload); // unknown
 * } else {
 *   console.log(response); // Response
 * }
 */
export const tryPromise = st.tryPromise;

/**
 * Wraps an async function to return error values instead of throwing
 *
 * @example
 * const response = await tryAsync(fetch, 'http://example.com');
 * if (st.isErr(response)) {
 *   console.error(response.payload);
 * }
 */
export const tryAsync = st.tryAsync;

/**
 * Wraps a sync function to return error values instead of throwing
 *
 * @example
 * const result = trySync(JSON.parse, invalidJson);
 * if (st.isErr(result)) {
 *   console.error('Parse failed:', result.payload);
 * }
 */
export const trySync = st.trySync;

/**
 * Checks if a value is an error
 */
export const isErr = st.isErr;

/**
 * Creates a generic error
 */
export const err = st.err;

// ============================================================================
// Type Guards
// ============================================================================

export function isHttpErr(value: unknown): value is HttpErr {
  return value instanceof HttpErr;
}

export function isBriaApiErr(value: unknown): value is BriaApiErr {
  return value instanceof BriaApiErr;
}

export function isBriaTokenErr(value: unknown): value is BriaTokenErr {
  return value instanceof BriaTokenErr;
}

export function isStorageErr(value: unknown): value is StorageErr {
  return value instanceof StorageErr;
}

export function isQuotaErr(value: unknown): value is QuotaErr {
  return value instanceof QuotaErr;
}

export function isValidationErr(value: unknown): value is ValidationErr {
  return value instanceof ValidationErr;
}

export function isFiboAnalysisErr(value: unknown): value is FiboAnalysisErr {
  return value instanceof FiboAnalysisErr;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Converts an unknown error to a safe error
 */
export function toSafeError(error: unknown): st.Err<unknown> {
  if (isErr(error)) {
    return error;
  }

  if (error instanceof Error) {
    return st.err(error);
  }

  return st.err(error);
}

/**
 * Extracts error message from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (isHttpErr(error)) {
    return error.payload.message;
  }

  if (isBriaApiErr(error)) {
    return error.payload.message;
  }

  if (isBriaTokenErr(error)) {
    return error.payload.message;
  }

  if (isStorageErr(error)) {
    return error.payload.message;
  }

  if (isQuotaErr(error)) {
    return error.payload.message;
  }

  if (isValidationErr(error)) {
    return error.payload.message;
  }

  if (isFiboAnalysisErr(error)) {
    return error.payload.message;
  }

  if (isErr(error)) {
    const payload = error.payload;
    if (typeof payload === 'string') {
      return payload;
    }
    if (payload instanceof Error) {
      return payload.message;
    }
    if (payload && typeof payload === 'object' && 'message' in payload) {
      return String((payload as { message: unknown }).message);
    }
    return 'Unknown error';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

/**
 * Retry helper with exponential backoff that returns errors as values
 *
 * @example
 * const result = await retryWithBackoff(
 *   async () => fetchData(),
 *   3,
 *   (error) => isHttpErr(error) && error.payload.status >= 500
 * );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T | st.Err<unknown>>,
  maxRetries: number,
  shouldRetry: (error: st.Err<unknown>) => boolean = () => true,
  baseDelay = 1000
): Promise<T | st.Err<unknown>> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = await fn();

    if (!isErr(result)) {
      return result;
    }

    // Last attempt failed
    if (attempt === maxRetries) {
      return result;
    }

    // Check if should retry
    if (!shouldRetry(result)) {
      return result;
    }

    // Exponential backoff with jitter
    const delay = Math.pow(2, attempt) * baseDelay;
    const jitter = Math.random() * 500;
    await new Promise(resolve => setTimeout(resolve, delay + jitter));
  }

  return st.err('Max retries exceeded');
}

/**
 * Maps a successful result through a function, preserving errors
 */
export function mapOk<T, U>(
  result: T | st.Err<unknown>,
  fn: (value: T) => U
): U | st.Err<unknown> {
  if (isErr(result)) {
    return result;
  }
  return fn(result);
}

/**
 * Maps an error through a function, preserving success values
 */
export function mapErr<T>(
  result: T | st.Err<unknown>,
  fn: (error: st.Err<unknown>) => st.Err<unknown>
): T | st.Err<unknown> {
  if (isErr(result)) {
    return fn(result);
  }
  return result;
}

/**
 * Unwraps a result, throwing if it's an error
 */
export function unwrap<T>(result: T | st.Err<unknown>): T {
  if (isErr(result)) {
    const message = getErrorMessage(result);
    throw new Error(message);
  }
  return result;
}

/**
 * Unwraps a result, returning a default value if it's an error
 */
export function unwrapOr<T>(result: T | st.Err<unknown>, defaultValue: T): T {
  if (isErr(result)) {
    return defaultValue;
  }
  return result;
}

/**
 * Unwraps a result, calling a function to produce a default value if it's an error
 */
export function unwrapOrElse<T>(
  result: T | st.Err<unknown>,
  fn: (error: st.Err<unknown>) => T
): T {
  if (isErr(result)) {
    return fn(result);
  }
  return result;
}
