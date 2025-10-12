import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, UIMessage } from "ai";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: openai("gpt-5-mini"),
    system:
      "You are a helpful assistant that can generate images. When the user asks you to create or generate an image, use the generateTextToImage tool. For images, you can suggest different styles like anime, cartoon, realistic, etc.",
    messages: convertToModelMessages(messages),
    tools: {
      generateTextToImage: {
        description: "Generate an image from a text prompt with optional style",
        inputSchema: z.object({
          prompt: z
            .string()
            .describe("The text prompt to generate an image from"),
          imageSize: z
            .enum(["square"])
            .default("square")
            .describe(
              "The aspect ratio of the generated image. Always use 'square' format."
            ),
        }),
      },
    },
  });

  return result.toUIMessageStreamResponse();
}
