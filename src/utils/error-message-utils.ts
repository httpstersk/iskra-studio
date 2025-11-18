/**
 * Utility functions for extracting user-friendly error messages
 * @module utils/error-message-utils
 */

/**
 * Extracts a user-friendly short error message from a technical error.
 *
 * Converts long technical error messages into concise, readable labels
 * suitable for display on canvas placeholders.
 *
 * @param error - Error object or string
 * @returns Short, user-friendly error message
 *
 * @example
 * ```typescript
 * extractShortErrorMessage("FIBO analysis failed...content moderation...")
 * // Returns: "Content Blocked"
 * ```
 */
export function extractShortErrorMessage(error: unknown): string {
  const errorStr = error instanceof Error ? error.message : String(error);
  const lowerError = errorStr.toLowerCase();

  // Content moderation errors
  if (
    lowerError.includes("content moderation") ||
    lowerError.includes("content flagged") ||
    lowerError.includes("content checker")
  ) {
    return "Content Blocked";
  }

  // API/Network errors
  if (
    lowerError.includes("network") ||
    lowerError.includes("fetch failed") ||
    lowerError.includes("connection")
  ) {
    return "Network Error";
  }

  // Timeout errors
  if (lowerError.includes("timeout") || lowerError.includes("timed out")) {
    return "Timeout";
  }

  // Rate limit errors
  if (
    lowerError.includes("rate limit") ||
    lowerError.includes("too many requests")
  ) {
    return "Rate Limited";
  }

  // Upload errors
  if (lowerError.includes("upload") || lowerError.includes("storage")) {
    return "Upload Failed";
  }

  // FIBO analysis errors
  if (lowerError.includes("fibo")) {
    return "Analysis Failed";
  }

  // Authentication errors
  if (
    lowerError.includes("unauthorized") ||
    lowerError.includes("authentication") ||
    lowerError.includes("api key")
  ) {
    return "Auth Error";
  }

  // Quota errors
  if (lowerError.includes("quota") || lowerError.includes("limit exceeded")) {
    return "Quota Exceeded";
  }

  // 422 Unprocessable Entity
  if (lowerError.includes("422") || lowerError.includes("unprocessable")) {
    return "Invalid Input";
  }

  // 500 Server errors
  if (lowerError.includes("500") || lowerError.includes("internal server")) {
    return "Server Error";
  }

  // Generic API errors
  if (lowerError.includes("api error")) {
    return "API Error";
  }

  // Default for unknown errors
  return "Generation Failed";
}

/**
 * Extracts the full error message for logging or detailed display.
 *
 * @param error - Error object or string
 * @returns Full error message string
 */
export function extractFullErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
