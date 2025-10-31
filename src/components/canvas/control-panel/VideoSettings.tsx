"use client";

import { SegmentedControl } from "@radix-ui/themes";

/**
 * Props for the VideoSettings component
 */
interface VideoSettingsProps {
  setVideoDuration: (value: "4" | "8" | "12") => void;
  setVideoModel: (
    value: "sora-2" | "sora-2-pro" | "veo-3.1" | "veo-3.1-pro"
  ) => void;
  videoDuration: "4" | "8" | "12";
  videoModel: "sora-2" | "sora-2-pro" | "veo-3.1" | "veo-3.1-pro";
}

/**
 * Video-specific settings controls (Model selector and Duration selector)
 */
export function VideoSettings({
  setVideoDuration,
  setVideoModel,
  videoDuration,
  videoModel,
}: VideoSettingsProps) {
  return (
    <>
      {/* Model selector */}
      <SegmentedControl.Root
        size="1"
        value={videoModel}
        onValueChange={(value) =>
          setVideoModel(
            value as "sora-2" | "sora-2-pro" | "veo-3.1" | "veo-3.1-pro"
          )
        }
      >
        <SegmentedControl.Item value="sora-2">
          <span className="text-xs">SORA2</span>
        </SegmentedControl.Item>
        <SegmentedControl.Item value="veo-3.1">
          <span className="text-xs">VEO Fast</span>
        </SegmentedControl.Item>
        <SegmentedControl.Item value="veo-3.1-pro">
          <span className="text-xs">VEO Pro</span>
        </SegmentedControl.Item>
      </SegmentedControl.Root>

      {/* Duration selector */}
      <SegmentedControl.Root
        size="1"
        value={videoDuration}
        onValueChange={(value) => setVideoDuration(value as "4" | "8" | "12")}
      >
        <SegmentedControl.Item value="4">
          <span className="text-xs">4s</span>
        </SegmentedControl.Item>
        <SegmentedControl.Item value="8">
          <span className="text-xs">8s</span>
        </SegmentedControl.Item>
        <SegmentedControl.Item value="12">
          <span className="text-xs">12s</span>
        </SegmentedControl.Item>
      </SegmentedControl.Root>
    </>
  );
}
