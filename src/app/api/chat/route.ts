import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 8000;

const richContentSchema = z.array(
  z
    .object({
      type: z.string(),
      text: z.string().optional(),
    })
    .passthrough(),
);

const uiMessageSchema = z
  .object({
    id: z.string().optional(),
    role: z.enum(["system", "user", "assistant", "tool"], {
      invalid_type_error: "Invalid message role",
    }),
    content: z.union([z.string(), richContentSchema]),
  })
  .passthrough();

const chatRequestSchema = z.object({
  messages: z.array(uiMessageSchema).min(1).max(MAX_MESSAGES),
});

export async function POST(req: Request) {
  const parseResult = chatRequestSchema.safeParse(await req.json());

  if (!parseResult.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parseResult.error.flatten() },
      { status: 400 },
    );
  }

  const { messages } = parseResult.data;

  for (const message of messages) {
    const length =
      typeof message.content === "string"
        ? message.content.length
        : JSON.stringify(message.content).length;

    if (length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: "Message content is too large" },
        { status: 413 },
      );
    }
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 },
    );
  }

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
