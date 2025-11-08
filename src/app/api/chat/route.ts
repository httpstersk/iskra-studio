import { openai } from "@ai-sdk/openai";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createAuthenticatedHandler, requireEnv } from "@/lib/api/api-handler";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const MAX_MESSAGES = 40;
const MAX_MESSAGE_LENGTH = 8000;

const messagePartSchema = z
  .object({
    type: z.string().trim().min(1),
    text: z.string().optional(),
  })
  .passthrough();

const uiMessageBaseSchema = z
  .object({
    id: z.string().optional(),
    role: z.enum(["system", "user", "assistant", "tool"], {
      invalid_type_error: "Invalid message role",
    }),
    content: z.union([z.string(), z.array(messagePartSchema)]).optional(),
    parts: z.array(messagePartSchema).optional(),
  })
  .passthrough();

const uiMessageSchema = uiMessageBaseSchema.refine(
  (value) => value.content !== undefined || value.parts !== undefined,
  {
    message: "Message must include content or parts",
    path: ["content"],
  }
);

const chatRequestSchema = z.object({
  messages: z.array(uiMessageSchema).min(1).max(MAX_MESSAGES),
});

export const POST = createAuthenticatedHandler({
  schema: chatRequestSchema,
  handler: async (input) => {
    const { messages } = input;

    // Validate message lengths
    for (const message of messages) {
      const length = (() => {
        if (typeof message.content === "string") {
          return message.content.length;
        }

        if (Array.isArray(message.content)) {
          return JSON.stringify(message.content).length;
        }

        if (Array.isArray(message.parts)) {
          return JSON.stringify(message.parts).length;
        }

        return 0;
      })();

      if (length > MAX_MESSAGE_LENGTH) {
        throw new Error("Message content is too large");
      }
    }

    // Validate API key
    requireEnv("OPENAI_API_KEY", "OpenAI API key");

    // Normalize messages
    const normalizedMessages: Array<Omit<UIMessage, "id">> = [];

    for (const message of messages) {
      const baseParts =
        message.parts ??
        (() => {
          if (typeof message.content === "string") {
            return [
              {
                type: "text",
                text: message.content,
              },
            ];
          }

          if (Array.isArray(message.content)) {
            return message.content;
          }

          return [];
        })();

      if (!Array.isArray(baseParts) || baseParts.length === 0) {
        throw new Error("Each message must include at least one part");
      }

      const sanitizedParts = baseParts.map((part) => {
        if (part.type === "text" && typeof part.text !== "string") {
          return {
            ...part,
            text: String(part.text ?? ""),
          } as UIMessage["parts"][number];
        }

        return part as UIMessage["parts"][number];
      });

      normalizedMessages.push({
        role: (message.role === "tool"
          ? "assistant"
          : message.role) as UIMessage["role"],
        parts: sanitizedParts as UIMessage["parts"],
      });
    }

    const result = streamText({
      model: openai("gpt-5-mini"),
      system:
        "You are a helpful assistant that can generate images. When the user asks you to create or generate an image, use the generateTextToImage tool. For images, you can suggest different styles like anime, cartoon, realistic, etc.",
      messages: convertToModelMessages(normalizedMessages),
      tools: {
        generateTextToImage: {
          description:
            "Generate an image from a text prompt with optional style",
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
  },
});
