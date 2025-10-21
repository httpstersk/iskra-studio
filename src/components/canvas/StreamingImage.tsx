import { useTRPC } from "@/trpc/client";
import type { ActiveGeneration } from "@/types/canvas";
import { useSubscription } from "@trpc/tanstack-react-query";
import React from "react";

interface StreamingImageProps {
  imageId: string;
  generation: ActiveGeneration;
  onComplete: (imageId: string, finalUrl: string) => void;
  onError: (imageId: string, error: string) => void;
  onStreamingUpdate: (imageId: string, url: string) => void;
}

export const StreamingImage: React.FC<StreamingImageProps> = ({
  imageId,
  generation,
  onComplete,
  onError,
  onStreamingUpdate,
}) => {
  const trpc = useTRPC();

  const onData = (data: { data: unknown }) => {
    const eventData = data.data as {
      type: string;
      data?: {
        images?: Array<{ url: string }>;
      };
      imageUrl?: string;
      error?: string;
      progress?: number;
      status?: string;
    };

    if (eventData.type === "progress") {
      const event = eventData.data;

      if (event?.images && event.images.length > 0) {
        onStreamingUpdate(imageId, event.images[0].url || "");
      }
    } else if (eventData.type === "complete") {
      if (eventData.imageUrl) {
        onComplete(imageId, eventData.imageUrl);
      }
    } else if (eventData.type === "error" && eventData.error) {
      onError(imageId, eventData.error);
    }
  };

  const onErrorHandler = (error: { message?: string }) => {
    console.error("Subscription error:", error);
    onError(imageId, error.message || "Generation failed");
  };

  // Use variation endpoint for variations, regular endpoint for normal generation
  const variationSubscription = useSubscription(
    trpc.generateImageVariation.subscriptionOptions(
      {
        imageUrl: generation.imageUrl,
        prompt: generation.prompt,
        ...(generation.model ? { model: generation.model } : {}),
        ...(generation.imageSize ? { imageSize: generation.imageSize } : {}),
      },
      {
        enabled: !!generation.isVariation,
        onData,
        onError: onErrorHandler,
      },
    ),
  );

  const regularSubscription = useSubscription(
    trpc.generateImageStream.subscriptionOptions(
      {
        imageUrl: generation.imageUrl,
        prompt: generation.prompt,
      },
      {
        enabled: !generation.isVariation,
        onData,
        onError: onErrorHandler,
      },
    ),
  );

  return null;
};
