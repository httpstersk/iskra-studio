/**
 * Constants for the Canvas Control Panel component
 */

/**
 * String constants for control panel UI elements
 */
export const CONTROL_PANEL_STRINGS = {
  IMAGE_MODE: "Image Mode",
  PRO_LABEL: "Pro",
  REDO: "Redo",
  RUN: "Run",
  SETTINGS: "Settings",
  TEXT_TO_IMAGE: "Text to Image",
  UNDO: "Undo",
  UPLOAD: "Upload",
  UPLOAD_FAILED: "Upload failed",
  UPLOAD_FAILED_DESC: "Failed to process selected files",
  UPLOAD_UNAVAILABLE: "Upload unavailable",
  UPLOAD_UNAVAILABLE_DESC:
    "File upload is not available. Try using drag & drop instead.",
  VARIATION_PLACEHOLDER: "Enter edit instructions for variations (optional)...",
  VIDEO_MODE: "Video Mode",
} as const;

/**
 * Generates prompt placeholder text with keyboard shortcut
 */
export const getPromptPlaceholder = (shortcut: string): string =>
  `Enter a prompt... (${shortcut}+Enter to run)`;

/**
 * Generates tooltip text for run button
 */
export const getRunTooltipText = (
  hasSelection: boolean,
  hasPrompt: boolean,
): string => {
  if (hasSelection && !hasPrompt) {
    return "Generate Variations";
  }
  return CONTROL_PANEL_STRINGS.RUN;
};

/**
 * Reusable shadow and border style constants
 */
export const CONTROL_PANEL_STYLES = {
  AMBER_BADGE:
    "bg-amber-500/10 dark:bg-amber-500/15 shadow-[0_0_0_1px_rgba(245,158,11,0.2),0_4px_8px_-0.5px_rgba(245,158,11,0.08),0_8px_16px_-2px_rgba(245,158,11,0.04)] dark:shadow-none dark:border dark:border-amber-500/30",
  BLUE_BADGE:
    "bg-blue-500/10 dark:bg-blue-500/15 shadow-[0_0_0_1px_rgba(59,130,246,0.2),0_4px_8px_-0.5px_rgba(59,130,246,0.08),0_8px_16px_-2px_rgba(59,130,246,0.04)] dark:shadow-none dark:border dark:border-blue-500/30",
  CARD_SHADOW:
    "shadow-[0_0_0_1px_rgba(50,50,50,0.16),0_4px_8px_-0.5px_rgba(50,50,50,0.08),0_8px_16px_-2px_rgba(50,50,50,0.04)]",
  DARK_OUTLINE:
    "dark:shadow-none dark:outline dark:outline-1 dark:outline-border",
  GENERATING_BADGE:
    "shadow-[0_0_0_1px_rgba(236,6,72,0.2),0_4px_8px_-0.5px_rgba(236,6,72,0.08),0_8px_16px_-2px_rgba(236,6,72,0.04)] dark:shadow-none dark:border dark:border-[#EC0648]/30",
  GRAY_BADGE:
    "bg-gray-500/10 dark:bg-gray-500/15 shadow-[0_0_0_1px_rgba(107,114,128,0.2),0_4px_8px_-0.5px_rgba(107,114,128,0.08),0_8px_16px_-2px_rgba(107,114,128,0.04)] dark:shadow-none dark:border dark:border-gray-500/30",
  GROUP_SHADOW:
    "shadow-[0_0_0_1px_rgba(50,50,50,0.12),0_4px_8px_-0.5px_rgba(50,50,50,0.04),0_8px_16px_-2px_rgba(50,50,50,0.02)]",
  ORANGE_BADGE:
    "bg-orange-500/10 dark:bg-orange-500/15 shadow-[0_0_0_1px_rgba(249,115,22,0.2),0_4px_8px_-0.5px_rgba(249,115,22,0.08),0_8px_16px_-2px_rgba(249,115,22,0.04)] dark:shadow-none dark:border dark:border-orange-500/30",
  PURPLE_BADGE:
    "bg-purple-500/10 dark:bg-purple-500/15 shadow-[0_0_0_1px_rgba(168,85,247,0.2),0_4px_8px_-0.5px_rgba(168,85,247,0.08),0_8px_16px_-2px_rgba(168,85,247,0.04)] dark:shadow-none dark:border dark:border-purple-500/30",
  SLATE_BADGE:
    "bg-slate-500/10 dark:bg-slate-500/15 shadow-[0_0_0_1px_rgba(100,116,139,0.2),0_4px_8px_-0.5px_rgba(100,116,139,0.08),0_8px_16px_-2px_rgba(100,116,139,0.04)] dark:shadow-none dark:border dark:border-slate-500/30",
  SUCCESS_BADGE:
    "shadow-[0_0_0_1px_rgba(34,197,94,0.2),0_4px_8px_-0.5px_rgba(34,197,94,0.08),0_8px_16px_-2px_rgba(34,197,94,0.04)] dark:shadow-none dark:border dark:border-green-500/30",
  VIDEO_GENERATING_BADGE:
    "shadow-[0_0_0_1px_rgba(168,85,247,0.2),0_4px_8px_-0.5px_rgba(168,85,247,0.08),0_8px_16px_-2px_rgba(168,85,247,0.04)] dark:shadow-none dark:border dark:border-purple-500/30",
} as const;

/**
 * Video duration options
 */
export const VIDEO_DURATION_OPTIONS = [
  { label: "4s", value: "4" },
  { label: "8s", value: "8" },
  { label: "12s", value: "12" },
] as const;

/**
 * File input configuration for upload
 */
export const FILE_INPUT_CONFIG = {
  ACCEPT: "image/*",
  CLEANUP_TIMEOUT: 30000,
  CLICK_DELAY: 10,
  MULTIPLE: true,
  TYPE: "file",
} as const;
