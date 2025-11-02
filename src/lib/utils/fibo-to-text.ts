/**
 * Converts FIBO structured prompt to a string wrapped in backticks
 * Preserves the full FIBO JSON structure for Seedream/Nano Banana
 */

export function fiboStructuredToText(structuredPrompt: any): string {
  // Stringify the FIBO JSON and wrap in backticks
  const jsonString = JSON.stringify(structuredPrompt, null, 2);
  return `\`\`\`json\n${jsonString}\n\`\`\``;
}
