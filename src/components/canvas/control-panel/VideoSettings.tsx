"use client";

import { SegmentedControl } from "@radix-ui/themes";

/**
 * Props for the VideoSettings component
 */
interface VideoSettingsProps {
  setUseSoraPro: (value: boolean) => void;
  setVideoDuration: (value: "4" | "8" | "12") => void;
  useSoraPro: boolean;
  videoDuration: "4" | "8" | "12";
}

/**
 * Video-specific settings controls (Pro toggle and Duration selector)
 */
export function VideoSettings({
  setUseSoraPro,
  setVideoDuration,
  useSoraPro,
  videoDuration,
}: VideoSettingsProps) {
  return (
    <>
      {/* Sora Pro toggle */}
      <SegmentedControl.Root
        size="1"
        value={useSoraPro ? "pro" : "off"}
        onValueChange={(value) => setUseSoraPro(value === "pro")}
      >
        <SegmentedControl.Item value="off">
          <span className="text-xs">Normal</span>
        </SegmentedControl.Item>
        <SegmentedControl.Item value="pro">
          <span className="text-xs">Pro</span>
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
