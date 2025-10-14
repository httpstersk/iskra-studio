/**
 * Video overlays component - renders HTML video elements and controls over the canvas
 *
 * Optimized with sub-components and memoization for minimal rerenders
 *
 * @module components/canvas/VideoOverlays
 */

import { useVideoRefManager } from "@/hooks/useVideoRefManager";
import type { PlacedVideo } from "@/types/canvas";
import React, { useCallback, useEffect, useMemo } from "react";
import { SingleVideoOverlay } from "./video-overlays/SingleVideoOverlay";

/**
 * Props for the VideoOverlays component
 */
interface VideoOverlaysProps {
  hiddenVideoControlsIds: Set<string>;
  selectedIds: string[];
  setVideos: React.Dispatch<React.SetStateAction<PlacedVideo[]>>;
  videos: PlacedVideo[];
  viewport: {
    scale: number;
    x: number;
    y: number;
  };
}

/**
 * VideoOverlays component - renders video elements with playback controls
 * Optimized with extracted sub-components and memoized callbacks
 */
export const VideoOverlays = React.memo<VideoOverlaysProps>(
  function VideoOverlays({
    hiddenVideoControlsIds,
    selectedIds,
    setVideos,
    videos,
    viewport,
  }) {
    const { createRefCallback, videoRefs } = useVideoRefManager();

    /**
     * Handles video click to toggle play/pause
     */
    const handleVideoClick = useCallback(
      (videoId: string, videoEl: HTMLVideoElement) => {
        if (videoEl.paused) {
          videoEl.play();
          setVideos((prev) =>
            prev.map((vid) =>
              vid.id === videoId ? { ...vid, isPlaying: true } : vid
            )
          );
        } else {
          videoEl.pause();
          setVideos((prev) =>
            prev.map((vid) =>
              vid.id === videoId ? { ...vid, isPlaying: false } : vid
            )
          );
        }
      },
      [setVideos]
    );

    /**
     * Handles video time update events
     */
    const handleVideoTimeUpdate = useCallback(
      (videoId: string, videoEl: HTMLVideoElement, currentTime: number) => {
        if (!videoEl.paused) {
          const currentTenthSecond = Math.floor(videoEl.currentTime * 10);
          const storedTenthSecond = Math.floor(currentTime * 10);

          if (currentTenthSecond !== storedTenthSecond) {
            setVideos((prev) =>
              prev.map((vid) =>
                vid.id === videoId
                  ? { ...vid, currentTime: videoEl.currentTime }
                  : vid
              )
            );
          }
        }
      },
      [setVideos]
    );

    /**
     * Handles video metadata loaded event
     */
    const handleVideoLoadedMetadata = useCallback(
      (videoId: string, videoEl: HTMLVideoElement) => {
        setVideos((prev) =>
          prev.map((vid) =>
            vid.id === videoId
              ? { ...vid, duration: videoEl.duration, isLoaded: true }
              : vid
          )
        );
      },
      [setVideos]
    );

    /**
     * Handles video ended event
     */
    const handleVideoEnded = useCallback(
      (videoId: string, isLooping: boolean) => {
        if (!isLooping) {
          setVideos((prev) =>
            prev.map((vid) =>
              vid.id === videoId
                ? { ...vid, currentTime: 0, isPlaying: false }
                : vid
            )
          );
        }
      },
      [setVideos]
    );

    /**
     * Handles video control changes
     */
    const handleVideoChange = useCallback(
      (videoId: string, newAttrs: Partial<PlacedVideo>) => {
        setVideos((prev) =>
          prev.map((vid) => (vid.id === videoId ? { ...vid, ...newAttrs } : vid))
        );
      },
      [setVideos]
    );

    /**
     * Filter visible videos (not loading and have source)
     */
    const visibleVideos = useMemo(
      () => videos.filter((video) => video.src && !video.isLoading),
      [videos]
    );

    /**
     * Synchronizes video element properties with state
     */
    useEffect(() => {
      videos.forEach((video) => {
        const videoEl = videoRefs.current.get(video.id);
        if (!videoEl) return;

        if (video.isPlaying && videoEl.paused) {
          videoEl.play().catch(() => { });
        } else if (!video.isPlaying && !videoEl.paused) {
          videoEl.pause();
        }

        if (videoEl.volume !== video.volume) {
          videoEl.volume = video.volume;
        }
        if (videoEl.muted !== video.muted) {
          videoEl.muted = video.muted;
        }
        if (videoEl.loop !== (video.isLooping || false)) {
          videoEl.loop = video.isLooping || false;
        }
      });
    }, [videos]);

    return (
      <>
        {visibleVideos.map((video) => (
          <SingleVideoOverlay
            handleVideoChange={handleVideoChange}
            handleVideoClick={handleVideoClick}
            handleVideoEnded={handleVideoEnded}
            handleVideoLoadedMetadata={handleVideoLoadedMetadata}
            handleVideoTimeUpdate={handleVideoTimeUpdate}
            isControlsHidden={hiddenVideoControlsIds.has(video.id)}
            isSelected={selectedIds.includes(video.id)}
            isSingleSelection={selectedIds.length === 1}
            key={video.id}
            refCallback={createRefCallback(video.id)}
            video={video}
            viewport={viewport}
          />
        ))}
      </>
    );
  }
);
