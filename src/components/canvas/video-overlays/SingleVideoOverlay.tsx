/**
 * Single video overlay component - combines video element, play indicator, and controls
 *
 * @module components/canvas/video-overlays/SingleVideoOverlay
 */

import { useVideoContextMenu } from "@/hooks/useVideoContextMenu";
import type { PlacedVideo } from "@/types/canvas";
import React from "react";
import { VideoControlsWrapper } from "./VideoControlsWrapper";
import { VideoElement } from "./VideoElement";
import { VideoPlayIndicator } from "./VideoPlayIndicator";

/**
 * Props for the SingleVideoOverlay component
 */
interface SingleVideoOverlayProps {
  handleVideoChange: (videoId: string, newAttrs: Partial<PlacedVideo>) => void;
  handleVideoClick: (videoId: string, videoEl: HTMLVideoElement) => void;
  handleVideoEnded: (videoId: string, isLooping: boolean) => void;
  handleVideoLoadedMetadata: (videoId: string, videoEl: HTMLVideoElement) => void;
  handleVideoTimeUpdate: (
    videoId: string,
    videoEl: HTMLVideoElement,
    currentTime: number
  ) => void;
  isControlsHidden: boolean;
  isSelected: boolean;
  isSingleSelection: boolean;
  refCallback: (el: HTMLVideoElement | null) => void;
  video: PlacedVideo;
  viewport: {
    scale: number;
    x: number;
    y: number;
  };
}

/**
 * SingleVideoOverlay component - renders a complete video overlay with all interactions
 */
export const SingleVideoOverlay = React.memo<SingleVideoOverlayProps>(
  function SingleVideoOverlay({
    handleVideoChange,
    handleVideoClick,
    handleVideoEnded,
    handleVideoLoadedMetadata,
    handleVideoTimeUpdate,
    isControlsHidden,
    isSelected,
    isSingleSelection,
    refCallback,
    video,
    viewport,
  }) {
    const handleContextMenu = useVideoContextMenu(video.id);

    const handleChange = React.useCallback(
      (newAttrs: Partial<PlacedVideo>) => {
        handleVideoChange(video.id, newAttrs);
      },
      [handleVideoChange, video.id]
    );

    return (
      <React.Fragment key={`controls-${video.id}`}>
        <VideoElement
          handleVideoClick={handleVideoClick}
          handleVideoEnded={handleVideoEnded}
          handleVideoLoadedMetadata={handleVideoLoadedMetadata}
          handleVideoTimeUpdate={handleVideoTimeUpdate}
          isSelected={isSelected}
          onContextMenu={handleContextMenu}
          refCallback={refCallback}
          video={video}
          viewport={viewport}
        />

        <VideoPlayIndicator
          isHidden={isControlsHidden}
          video={video}
          viewport={viewport}
        />

        {isSelected && isSingleSelection && (
          <VideoControlsWrapper
            isHidden={isControlsHidden}
            onChange={handleChange}
            video={video}
            viewport={viewport}
          />
        )}
      </React.Fragment>
    );
  }
);
