"use client";

import { SegmentedControl } from "@/components/ui/segmented-control";

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
    <SegmentedControl
      value={imageModel}
      onValueChange={(value) => setImageModel(value as "seedream" | "reve")}
      options={[
        { value: "seedream", label: "Seedream" },
        { value: "reve", label: "Reve" },
      ]}
      activeColor="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900"
      inactiveColor="text-gray-600 dark:text-gray-400"
      className="h-9"
    />
  );
}
