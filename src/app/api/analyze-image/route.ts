/**
 * Image Analysis API Route
 * Analyzes images focusing on STYLE and MOOD using OpenAI's vision model with structured output
 */

import { createAuthenticatedHandler } from "@/lib/api/api-handler";
import { analyzeImageCore } from "@/lib/image-analyzer";
import { z } from "zod";

export const maxDuration = 30;

const analyzeImageRequestSchema = z.object({
  imageUrl: z
    .string()
    .trim()
    .url()
    .max(2048)
    .refine(
      (value) => value.startsWith("https://") || value.startsWith("http://"),
      {
        message: "Image URL must use http or https",
      }
    ),
});

export const POST = createAuthenticatedHandler({
  schema: analyzeImageRequestSchema,
  handler: async (input) => {
    const result = await analyzeImageCore(input.imageUrl);

    return {
      analysis: result.analysis,
    };
  },
});
