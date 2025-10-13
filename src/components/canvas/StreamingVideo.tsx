import { SORA_2_MODEL_ID } from "@/lib/video-models";
import { useTRPC } from "@/trpc/client";
import type { ActiveVideoGeneration } from "@/types/canvas";
import { useSubscription } from "@trpc/tanstack-react-query";
import React from "react";

const STREAMING_COPY = {
  ERROR_PREFIX: "Image-to-video conversion error:",
  ERROR_SUMMARY: "Image-to-video conversion failed",
  PROGRESS: "Converting image to video...",
} as const;
const DEFAULT_DURATION_SECONDS = 4;

/**
 * Props for the streaming video subscriber component.
 */
interface StreamingVideoProps {
  apiKey?: string;
  generation: ActiveVideoGeneration;
  onComplete: (videoId: string, videoUrl: string, duration: number) => void;
  onError: (videoId: string, error: string) => void;
  onProgress: (videoId: string, progress: number, status: string) => void;
  videoId: string;
}

/**
 * Subscribes to the server-side image-to-video stream and relays progress updates.
 */
export const StreamingVideo: React.FC<StreamingVideoProps> = ({
  apiKey,
  generation,
  onComplete,
  onError,
  onProgress,
  videoId,
}) => {
  const trpc = useTRPC();

  const resolvedDuration =
    typeof generation.duration === "string"
      ? parseInt(generation.duration, 10)
      : (generation.duration ?? DEFAULT_DURATION_SECONDS);

  const additionalFields = Object.fromEntries(
    Object.entries(generation).filter(
      ([key, value]) =>
        value !== undefined &&
        ![
          "aspectRatio",
          "duration",
          "imageUrl",
          "modelConfig",
          "modelId",
          "prompt",
          "resolution",
          "sourceImageId",
          "sourceVideoId",
          "toastId",
          "videoUrl",
        ].includes(key),
    ),
  );

  // Ensure values match tRPC schema
  const validAspectRatios = ["auto", "9:16", "16:9"] as const;
  const validResolutions = ["auto", "720p", "1080p"] as const;

  const aspectRatio =
    generation.aspectRatio &&
    validAspectRatios.includes(generation.aspectRatio as any)
      ? (generation.aspectRatio as "auto" | "9:16" | "16:9")
      : undefined;

  const resolution =
    generation.resolution &&
    validResolutions.includes(generation.resolution as any)
      ? (generation.resolution as "auto" | "720p" | "1080p")
      : "auto";

  const subscriptionOptions = trpc.generateImageToVideo.subscriptionOptions(
    {
      aspectRatio,
      duration: resolvedDuration,
      imageUrl: generation.imageUrl || "",
      modelId: generation.modelId || SORA_2_MODEL_ID,
      prompt: generation.prompt,
      resolution,
      ...additionalFields,
      ...(apiKey ? { apiKey } : {}),
    },
    {
      enabled: true,
      onData: async (data: { data: unknown }) => {
        const eventData = data.data as {
          duration?: number;
          error?: string;
          progress?: number;
          status?: string;
          type: string;
          videoUrl?: string;
        };

        if (eventData.type === "progress") {
          onProgress(
            videoId,
            eventData.progress ?? 0,
            eventData.status || STREAMING_COPY.PROGRESS,
          );
        } else if (eventData.type === "complete" && eventData.videoUrl) {
          onComplete(
            videoId,
            eventData.videoUrl,
            eventData.duration ?? resolvedDuration,
          );
        } else if (eventData.type === "error" && eventData.error) {
          onError(videoId, eventData.error);
        }
      },
      onError: (error) => {
        console.error(STREAMING_COPY.ERROR_PREFIX, error);
        onError(videoId, error.message || STREAMING_COPY.ERROR_SUMMARY);
      },
    },
  );

  useSubscription(subscriptionOptions);

  return null;
};
