import { useTRPC } from "@/trpc/client";
import type { ActiveGeneration } from "@/types/canvas";
import { isContentValidationError } from "@/utils/image-error-overlay";
import { useSubscription } from "@trpc/tanstack-react-query";
import React from "react";

interface StreamingImageProps {
  imageId: string;
  generation: ActiveGeneration;
  onComplete: (
    imageId: string,
    finalUrl: string,
    thumbnailUrl?: string,
  ) => void;
  onError: (imageId: string, error: string, isContentError?: boolean) => void;
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

  const onErrorHandler = (error: { message?: string }) => {
    const errorMessage = error.message?.trim() || "Generation failed";
    const isContentError = isContentValidationError(errorMessage);
    onError(imageId, errorMessage, isContentError);
  };

  const onData = (data: { data: unknown }) => {
    const eventData = data.data as {
      data?: {
        images?: Array<{ url: string }>;
      };
      error?: string;
      imageUrl?: string;
      progress?: number;
      status?: string;
      thumbnailUrl?: string;
      type: string;
    };

    if (eventData.type === "progress") {
      const event = eventData.data;

      if (event?.images && event.images.length > 0) {
        onStreamingUpdate(imageId, event.images[0].url || "");
      }
    } else if (eventData.type === "complete") {
      if (eventData.imageUrl) {
        onComplete(imageId, eventData.imageUrl, eventData.thumbnailUrl);
      }
    } else if (eventData.type === "error") {
      onErrorHandler({ message: eventData.error });
    }
  };

  /**
   * Conditionally subscribe to variation or regular image generation.
   * Only the enabled subscription will make tRPC calls.
   *
   * Note: Both hooks must be called unconditionally (Rules of Hooks),
   * but the `enabled` flag ensures only one is active at a time.
   */

  // Variation generation (Seedream/Nano Banana) - includes director and camera angles mode
  useSubscription(
    trpc.generateImageVariation.subscriptionOptions(
      {
        imageUrls: generation.imageUrls || [generation.imageUrl || ""],
        prompt: generation.prompt || "",
        ...(generation.model ? { model: generation.model } : {}),
        ...(generation.imageSize ? { imageSize: generation.imageSize } : {}),
      },
      {
        enabled:
          !!generation.isVariation &&
          (!!generation.imageUrl || (!!generation.imageUrls && generation.imageUrls.length > 0)) &&
          !!generation.prompt,
        onData,
        onError: onErrorHandler,
      },
    ),
  );

  // Text-to-image generation
  useSubscription(
    trpc.generateImageStream.subscriptionOptions(
      {
        imageUrl: generation.imageUrl || "",
        prompt: generation.prompt || "",
      },
      {
        enabled:
          !generation.isVariation &&
          !!generation.imageUrl &&
          !!generation.prompt,
        onData,
        onError: onErrorHandler,
      },
    ),
  );

  return null;
};
