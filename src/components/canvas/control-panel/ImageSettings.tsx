"use client";

import { SegmentedControl } from "@radix-ui/themes";

/**
 * Props for the ImageSettings component
 */
interface ImageSettingsProps {
  imageModel: "seedream" | "reve";
  setImageModel: (value: "seedream" | "reve") => void;
}

/**
 * Image-specific settings controls (Model switcher)
 */
export function ImageSettings({
  imageModel,
  setImageModel,
}: ImageSettingsProps) {
  return (
    <SegmentedControl.Root
      size="1"
      value={imageModel}
      onValueChange={(value) => setImageModel(value as "seedream" | "reve")}
    >
      <SegmentedControl.Item value="seedream">
        <span className="text-xs">Seedream</span>
      </SegmentedControl.Item>
      <SegmentedControl.Item value="reve">
        <span className="text-xs">Reve</span>
      </SegmentedControl.Item>
    </SegmentedControl.Root>
  );
}
