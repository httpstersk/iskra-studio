/**
 * UI state hook using Jotai
 * Manages dialog visibility, settings, and UI preferences with localStorage persistence
 */

import { useEffect } from "react";
import { useAtom } from "jotai";
import {
  customApiKeyAtom,
  generationCountAtom,
  hiddenVideoControlsIdsAtom,
  isApiKeyDialogOpenAtom,
  isImageToVideoDialogOpenAtom,
  isSettingsDialogOpenAtom,
  selectedImageForVideoAtom,
  showChatAtom,
  showGridAtom,
  showMinimapAtom,
  tempApiKeyAtom,
  variationModeAtom,
  visibleIndicatorsAtom,
} from "@/store/ui-atoms";

/**
 * Hook to manage UI state using Jotai atoms
 * Handles localStorage persistence for settings
 */
export function useUIState() {
  const [customApiKey, setCustomApiKey] = useAtom(customApiKeyAtom);
  const [generationCount, setGenerationCount] = useAtom(generationCountAtom);
  const [hiddenVideoControlsIds, setHiddenVideoControlsIds] = useAtom(
    hiddenVideoControlsIdsAtom,
  );
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useAtom(
    isApiKeyDialogOpenAtom,
  );
  const [isImageToVideoDialogOpen, setIsImageToVideoDialogOpen] = useAtom(
    isImageToVideoDialogOpenAtom,
  );
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useAtom(
    isSettingsDialogOpenAtom,
  );
  const [selectedImageForVideo, setSelectedImageForVideo] = useAtom(
    selectedImageForVideoAtom,
  );
  const [showChat, setShowChat] = useAtom(showChatAtom);
  const [showGrid, setShowGrid] = useAtom(showGridAtom);
  const [showMinimap, setShowMinimap] = useAtom(showMinimapAtom);
  const [tempApiKey, setTempApiKey] = useAtom(tempApiKeyAtom);
  const [variationMode, setVariationMode] = useAtom(variationModeAtom);
  const [visibleIndicators, setVisibleIndicators] = useAtom(
    visibleIndicatorsAtom,
  );

  // Load API key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem("fal-api-key");
    if (savedKey) {
      setCustomApiKey(savedKey);
      setTempApiKey(savedKey);
    }
  }, [setCustomApiKey, setTempApiKey]);

  // Load grid setting from localStorage on mount
  useEffect(() => {
    const savedShowGrid = localStorage.getItem("showGrid");
    if (savedShowGrid !== null) {
      setShowGrid(savedShowGrid === "true");
    }
  }, [setShowGrid]);

  // Load minimap setting from localStorage on mount
  useEffect(() => {
    const savedShowMinimap = localStorage.getItem("showMinimap");
    if (savedShowMinimap !== null) {
      setShowMinimap(savedShowMinimap === "true");
    }
  }, [setShowMinimap]);

  // Save grid setting to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("showGrid", showGrid.toString());
  }, [showGrid]);

  // Save minimap setting to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("showMinimap", showMinimap.toString());
  }, [showMinimap]);

  // Save API key to localStorage when it changes
  useEffect(() => {
    if (customApiKey) {
      localStorage.setItem("fal-api-key", customApiKey);
    } else {
      localStorage.removeItem("fal-api-key");
    }
  }, [customApiKey]);

  return {
    customApiKey,
    generationCount,
    hiddenVideoControlsIds,
    isApiKeyDialogOpen,
    isImageToVideoDialogOpen,
    isSettingsDialogOpen,
    selectedImageForVideo,
    setCustomApiKey,
    setGenerationCount,
    setHiddenVideoControlsIds,
    setIsApiKeyDialogOpen,
    setIsImageToVideoDialogOpen,
    setIsSettingsDialogOpen,
    setSelectedImageForVideo,
    setShowChat,
    setShowGrid,
    setShowMinimap,
    setTempApiKey,
    setVariationMode,
    setVisibleIndicators,
    showChat,
    showGrid,
    showMinimap,
    tempApiKey,
    variationMode,
    visibleIndicators,
  };
}
