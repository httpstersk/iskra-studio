/**
 * Prompt validation and sanitization utilities
 * @module lib/prompt-utils
 */

/**
 * Validates and sanitizes a prompt string.
 * Trims whitespace and checks if the resulting string is non-empty.
 *
 * @param prompt - The prompt string to validate (can be undefined, null, or empty)
 * @returns The trimmed prompt if valid, undefined otherwise
 *
 * @example
 * ```ts
 * sanitizePrompt("  hello  ") // "hello"
 * sanitizePrompt("") // undefined
 * sanitizePrompt("   ") // undefined
 * sanitizePrompt(undefined) // undefined
 * ```
 */
export function sanitizePrompt(prompt?: string | null): string | undefined {
  if (!prompt) return undefined;

  const trimmed = prompt.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Validates and sanitizes a prompt, providing a fallback if empty.
 *
 * @param prompt - The prompt string to validate
 * @param fallback - The fallback string to use if prompt is empty/invalid
 * @returns The sanitized prompt or the fallback
 *
 * @example
 * ```ts
 * sanitizePromptWithFallback("hello", "default") // "hello"
 * sanitizePromptWithFallback("", "default") // "default"
 * sanitizePromptWithFallback("   ", "default") // "default"
 * ```
 */
export function sanitizePromptWithFallback(
  prompt: string | undefined | null,
  fallback: string,
): string {
  const sanitized = sanitizePrompt(prompt);
  return sanitized ?? fallback;
}
