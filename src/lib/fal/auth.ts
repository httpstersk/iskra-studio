/**
 * Authentication utilities for FAL.ai API.
 */

/**
 * Extracts a Bearer token from an Authorization header.
 *
 * @param authHeader - The Authorization header value
 * @returns The extracted token or undefined if invalid
 */
export function extractBearerToken(
  authHeader: string | null,
): string | undefined {
  if (!authHeader) return undefined;

  // Optimized parsing - avoid regex for better performance and ReDoS prevention
  const trimmed = authHeader.trim();

  // Check prefix (case-insensitive)
  if (!trimmed.toLowerCase().startsWith("bearer ")) {
    return undefined;
  }

  // Extract token part after "Bearer "
  const token = trimmed.slice(7).trim(); // "Bearer ".length === 7

  // Validate token
  if (!token || token.length === 0) {
    return undefined;
  }

  // Enforce maximum token length to prevent abuse
  if (token.length > 2048) {
    return undefined;
  }

  // Check for invalid characters (newlines, carriage returns, spaces)
  if (/[\r\n\s]/.test(token)) {
    return undefined;
  }

  return token;
}

/**
 * Checks if a custom API key is provided in the Authorization header.
 *
 * @param authHeader - The Authorization header value
 * @returns True if a valid custom API key is present
 */
export function hasCustomApiKey(authHeader: string | null): boolean {
  return Boolean(extractBearerToken(authHeader));
}
