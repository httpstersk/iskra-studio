/**
 * useVideoPlayback
 *
 * Synchronizes playback properties (isPlaying, volume, muted, loop, currentTime)
 * with a given HTMLVideoElement.
 */

import { useEffect } from "react";

/**
 * Synchronizes playback properties with a given HTMLVideoElement.
 *
 * @param videoEl - Managed video element
 * @param props - Playback and sync properties
 */
export function useVideoPlayback(
  videoEl: HTMLVideoElement | null,
  props: {
    currentTime: number;
    isPlaying: boolean;
    loop?: boolean;
    muted: boolean;
    onPlaybackError: (e: unknown) => void;
    volume: number;
  },
) {
  const { isPlaying, volume, muted, loop, currentTime, onPlaybackError } = props;

  useEffect(() => {
    if (!videoEl) return;
    videoEl.volume = volume;
    videoEl.muted = muted;
    videoEl.loop = !!loop;
  }, [videoEl, volume, muted, loop]);

  useEffect(() => {
    if (!videoEl) return;
    if (Math.abs(videoEl.currentTime - currentTime) > 2) {
      videoEl.currentTime = currentTime;
    }
  }, [videoEl, currentTime]);

  useEffect(() => {
    if (!videoEl) return;
    if (isPlaying) {
      videoEl.play().catch(onPlaybackError);
    } else {
      videoEl.pause();
    }
  }, [videoEl, isPlaying, onPlaybackError]);
}
