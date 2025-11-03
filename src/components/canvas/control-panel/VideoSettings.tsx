"use client";

import { SegmentedControl } from "@radix-ui/themes";

/**
 * Props for the VideoSettings component
 */
interface VideoSettingsProps {
  setVideoDuration: (value: "4" | "8" | "12") => void;
  setVideoModel: (
    value: "sora-2" | "sora-2-pro" | "veo-3.1" | "veo-3.1-pro",
  ) => void;
  videoDuration: "4" | "8" | "12";
  videoModel: "sora-2" | "sora-2-pro" | "veo-3.1" | "veo-3.1-pro";
}

type ModelFamily = "sora" | "veo";
type ModelQuality = "normal" | "pro" | "fast";

/**
 * Video-specific settings controls (Model family, Quality, and Duration selectors)
 */
export function VideoSettings({
  setVideoDuration,
  setVideoModel,
  videoDuration,
  videoModel,
}: VideoSettingsProps) {
  // Derive current model family and quality from full model ID
  const modelFamily: ModelFamily = videoModel.startsWith("sora")
    ? "sora"
    : "veo";
  const modelQuality: ModelQuality = videoModel.includes("pro")
    ? "pro"
    : videoModel === "veo-3.1"
      ? "fast"
      : "normal";

  // Handle model family change
  const handleModelFamilyChange = (family: ModelFamily) => {
    if (family === "sora") {
      // Keep quality if possible, default to normal
      setVideoModel(modelQuality === "pro" ? "sora-2-pro" : "sora-2");
    } else {
      // VEO: map normal -> fast, keep pro
      setVideoModel(modelQuality === "pro" ? "veo-3.1-pro" : "veo-3.1");
    }
  };

  // Handle quality change
  const handleQualityChange = (quality: ModelQuality) => {
    if (modelFamily === "sora") {
      setVideoModel(quality === "pro" ? "sora-2-pro" : "sora-2");
    } else {
      setVideoModel(quality === "pro" ? "veo-3.1-pro" : "veo-3.1");
    }
  };

  return (
    <>
      {/* Model family selector */}
      <SegmentedControl.Root
        size="1"
        value={modelFamily}
        onValueChange={(value) => handleModelFamilyChange(value as ModelFamily)}
      >
        <SegmentedControl.Item value="sora">
          <span className="text-xs">Sora</span>
        </SegmentedControl.Item>
        <SegmentedControl.Item value="veo">
          <span className="text-xs">Veo</span>
        </SegmentedControl.Item>
      </SegmentedControl.Root>

      {/* Quality selector - labels change based on model family */}
      <SegmentedControl.Root
        size="1"
        value={
          modelQuality === "normal" || modelQuality === "fast"
            ? "standard"
            : "pro"
        }
        onValueChange={(value) =>
          handleQualityChange(
            value === "pro" ? "pro" : modelFamily === "veo" ? "fast" : "normal",
          )
        }
      >
        <SegmentedControl.Item value="standard">
          <span className="text-xs">
            {modelFamily === "sora" ? "Normal" : "Fast"}
          </span>
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
