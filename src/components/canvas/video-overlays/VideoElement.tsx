/**
 * Video element component - renders the HTML video element with all event handlers
 *
 * @module components/canvas/video-overlays/VideoElement
 */

import {
  PLAY_INDICATOR_OFFSET,
  VIDEO_CONTROLS_OFFSET,
  VIDEO_OVERLAY_Z_INDEX,
} from "@/constants/video-overlays";
import { useVideoPositioning } from "@/hooks/useVideoPositioning";
import type { PlacedVideo } from "@/types/canvas";
import React, { useMemo } from "react";

/**
 * Props for the VideoElement component
 */
interface VideoElementProps {
  handleVideoClick: (videoId: string, videoEl: HTMLVideoElement) => void;
  handleVideoEnded: (videoId: string, isLooping: boolean) => void;
  handleVideoLoadedMetadata: (
    videoId: string,
    videoEl: HTMLVideoElement
  ) => void;
  handleVideoTimeUpdate: (
    videoId: string,
    videoEl: HTMLVideoElement,
    currentTime: number
  ) => void;
  isSelected: boolean;
  onContextMenu: (e: React.MouseEvent<HTMLVideoElement>) => void;
  refCallback: (el: HTMLVideoElement | null) => void;
  video: PlacedVideo;
  viewport: {
    scale: number;
    x: number;
    y: number;
  };
}

/**
 * VideoElement component - optimized video rendering with memoized styles
 */
export const VideoElement = React.memo<VideoElementProps>(
  function VideoElement({
    handleVideoClick,
    handleVideoEnded,
    handleVideoLoadedMetadata,
    handleVideoTimeUpdate,
    onContextMenu,
    refCallback,
    video,
    viewport,
  }) {
    const position = useVideoPositioning(
      video,
      viewport,
      VIDEO_CONTROLS_OFFSET,
      PLAY_INDICATOR_OFFSET
    );

    const videoStyle = useMemo(() => {
      return {
        height: position.height,
        left: position.left,
        objectFit: "fill" as const,
        pointerEvents: "none" as const,
        position: "absolute" as const,
        top: position.top,
        transform: `rotate(${video.rotation || 0}deg)`,
        transformOrigin: "center",
        visibility: "hidden" as const,
        width: position.width,
        zIndex: VIDEO_OVERLAY_Z_INDEX,
      };
    }, [
      position.height,
      position.left,
      position.top,
      position.width,
      video.rotation,
    ]);

    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLVideoElement>) => {
        e.stopPropagation();
        handleVideoClick(video.id, e.currentTarget);
      },
      [handleVideoClick, video.id]
    );

    const handleTimeUpdate = React.useCallback(
      (e: React.SyntheticEvent<HTMLVideoElement>) => {
        handleVideoTimeUpdate(video.id, e.currentTarget, video.currentTime);
      },
      [handleVideoTimeUpdate, video.currentTime, video.id]
    );

    const handleLoadedMetadata = React.useCallback(
      (e: React.SyntheticEvent<HTMLVideoElement>) => {
        handleVideoLoadedMetadata(video.id, e.currentTarget);
      },
      [handleVideoLoadedMetadata, video.id]
    );

    const handleEnded = React.useCallback(() => {
      handleVideoEnded(video.id, video.isLooping || false);
    }, [handleVideoEnded, video.id, video.isLooping]);

    return (
      <video
        autoPlay={false}
        crossOrigin="anonymous"
        id={`video-${video.id}`}
        loop={video.isLooping}
        muted={video.muted}
        onClick={handleClick}
        onContextMenu={onContextMenu}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        playsInline
        preload="auto"
        ref={refCallback}
        src={video.src}
        style={videoStyle}
      />
    );
  }
);
