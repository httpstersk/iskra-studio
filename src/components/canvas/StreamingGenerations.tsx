/**
 * StreamingGenerations component - Encapsulates streaming image and video rendering
 *
 * This component is memoized to prevent unnecessary rerenders when parent state changes.
 * It only rerenders when the activeGenerations or activeVideoGenerations Maps change.
 *
 * @module components/canvas/StreamingGenerations
 */

"use client";

import type { ActiveGeneration, ActiveVideoGeneration } from "@/types/canvas";
import React from "react";
import { StreamingImage } from "./StreamingImage";
import { StreamingVideo } from "./StreamingVideo";

/**
 * Props for the StreamingGenerations component
 */
interface StreamingGenerationsProps {
  activeGenerations: Map<string, ActiveGeneration>;
  activeVideoGenerations: Map<string, ActiveVideoGeneration>;
  onImageComplete: (
    imageId: string,
    finalUrl: string,
    thumbnailUrl?: string,
  ) => void;
  onImageError: (
    imageId: string,
    error: string,
    isContentError?: boolean,
  ) => void;
  onImageUpdate: (imageId: string, url: string) => void;
  onVideoComplete: (
    videoId: string,
    videoUrl: string,
    duration: number,
  ) => void;
  onVideoError: (videoId: string, error: string) => void;
  onVideoProgress: (videoId: string, progress: number, status: string) => void;
}

/**
 * Memoized component that renders all active streaming generations.
 *
 * Prevents unnecessary rerenders by only updating when the Maps themselves change,
 * not when unrelated parent state updates.
 *
 * @component
 */
export const StreamingGenerations = React.memo<StreamingGenerationsProps>(
  function StreamingGenerations({
    activeGenerations,
    activeVideoGenerations,
    onImageComplete,
    onImageError,
    onImageUpdate,
    onVideoComplete,
    onVideoError,
    onVideoProgress,
  }) {
    return (
      <>
        {Array.from(activeGenerations.entries()).map(
          ([imageId, generation]) => (
            <StreamingImage
              generation={generation}
              imageId={imageId}
              key={imageId}
              onComplete={onImageComplete}
              onError={onImageError}
              onStreamingUpdate={onImageUpdate}
            />
          ),
        )}

        {Array.from(activeVideoGenerations.entries()).map(
          ([id, generation]) => (
            <StreamingVideo
              generation={generation}
              key={id}
              onComplete={onVideoComplete}
              onError={onVideoError}
              onProgress={onVideoProgress}
              videoId={id}
            />
          ),
        )}
      </>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.activeGenerations === nextProps.activeGenerations &&
      prevProps.activeVideoGenerations === nextProps.activeVideoGenerations &&
      prevProps.onImageComplete === nextProps.onImageComplete &&
      prevProps.onImageError === nextProps.onImageError &&
      prevProps.onImageUpdate === nextProps.onImageUpdate &&
      prevProps.onVideoComplete === nextProps.onVideoComplete &&
      prevProps.onVideoError === nextProps.onVideoError &&
      prevProps.onVideoProgress === nextProps.onVideoProgress
    );
  },
);
