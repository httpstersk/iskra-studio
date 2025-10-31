/**
 * useVideoElement
 *
 * Manages an HTMLVideoElement lifecycle for a given source and initial props.
 * Attaches core listeners and cleans up on unmount or source change.
 */

import { useEffect, useState } from "react";
import { throttleRAF } from "@/utils/performance";

/**
 * Creates and manages an HTMLVideoElement for a given source and initial props.
 *
 * @param src - Video source URL
 * @param opts - Initial playback options (muted, volume, currentTime, loop)
 * @param onMeta - Callback when metadata is loaded (duration provided)
 * @param onTime - Callback on throttled timeupdate events
 * @returns Managed HTMLVideoElement or null when not ready
 */
export function useVideoElement(
  src: string,
  opts: { currentTime: number; loop?: boolean; muted: boolean; volume: number },
  onMeta: (duration: number) => void,
  onTime: (currentTime: number) => void,
): HTMLVideoElement | null {
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!src) {
      setVideoEl(null);
      return;
    }

    const el = document.createElement("video");
    el.src = src;
    el.crossOrigin = "anonymous";
    el.muted = opts.muted;
    el.volume = opts.volume;
    el.currentTime = opts.currentTime;
    el.loop = !!opts.loop;
    el.preload = "metadata";
    el.playsInline = true;
    el.disablePictureInPicture = true;

    const onLoadedMetadata = () => {
      onMeta(el.duration || 0);
    };

    const handleTimeUpdate = throttleRAF(() => {
      if (!el.paused) {
        onTime(el.currentTime);
      }
    });

    el.addEventListener("loadedmetadata", onLoadedMetadata);
    el.addEventListener("timeupdate", handleTimeUpdate);

    setVideoEl(el);
    el.load();

    return () => {
      el.removeEventListener("loadedmetadata", onLoadedMetadata);
      el.removeEventListener("timeupdate", handleTimeUpdate);
      el.pause();
      el.removeAttribute("src");
      el.load();
    };
  }, [src]);

  return videoEl;
}
