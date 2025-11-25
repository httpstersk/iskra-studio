/**
 * Converts FIBO structured prompt to a string wrapped in backticks
 * Preserves the full FIBO JSON structure for Seedream/Nano Banana
 */

export function fiboStructuredToText(
  structuredPrompt: Record<string, unknown>,
): string {
  return JSON.stringify(structuredPrompt, null, 2);
}
