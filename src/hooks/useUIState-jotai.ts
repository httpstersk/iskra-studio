/**
 * UI state hook using Jotai
 * Manages dialog visibility, settings, and UI preferences with localStorage persistence
 */

import { useEffect } from "react";
import { useAtom } from "jotai";
import {
  croppingImageIdAtom,
  customApiKeyAtom,
  hiddenVideoControlsIdsAtom,
  isApiKeyDialogOpenAtom,
  isExtendVideoDialogOpenAtom,
  isImageToVideoDialogOpenAtom,
  isRemoveVideoBackgroundDialogOpenAtom,
  isSettingsDialogOpenAtom,
  isStyleDialogOpenAtom,
  isVideoToVideoDialogOpenAtom,
  isolateInputValueAtom,
  isolateTargetAtom,
  selectedImageForVideoAtom,
  selectedVideoForBackgroundRemovalAtom,
  selectedVideoForExtendAtom,
  selectedVideoForVideoAtom,
  showChatAtom,
  showGridAtom,
  showMinimapAtom,
  tempApiKeyAtom,
  visibleIndicatorsAtom,
} from "@/store/ui-atoms";

/**
 * Hook to manage UI state using Jotai atoms
 * Handles localStorage persistence for settings
 */
export function useUIState() {
  const [croppingImageId, setCroppingImageId] = useAtom(croppingImageIdAtom);
  const [customApiKey, setCustomApiKey] = useAtom(customApiKeyAtom);
  const [hiddenVideoControlsIds, setHiddenVideoControlsIds] = useAtom(
    hiddenVideoControlsIdsAtom
  );
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useAtom(
    isApiKeyDialogOpenAtom
  );
  const [isExtendVideoDialogOpen, setIsExtendVideoDialogOpen] = useAtom(
    isExtendVideoDialogOpenAtom
  );
  const [isImageToVideoDialogOpen, setIsImageToVideoDialogOpen] = useAtom(
    isImageToVideoDialogOpenAtom
  );
  const [
    isRemoveVideoBackgroundDialogOpen,
    setIsRemoveVideoBackgroundDialogOpen,
  ] = useAtom(isRemoveVideoBackgroundDialogOpenAtom);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useAtom(
    isSettingsDialogOpenAtom
  );
  const [isStyleDialogOpen, setIsStyleDialogOpen] = useAtom(
    isStyleDialogOpenAtom
  );
  const [isVideoToVideoDialogOpen, setIsVideoToVideoDialogOpen] = useAtom(
    isVideoToVideoDialogOpenAtom
  );
  const [isolateInputValue, setIsolateInputValue] = useAtom(
    isolateInputValueAtom
  );
  const [isolateTarget, setIsolateTarget] = useAtom(isolateTargetAtom);
  const [selectedImageForVideo, setSelectedImageForVideo] = useAtom(
    selectedImageForVideoAtom
  );
  const [selectedVideoForBackgroundRemoval, setSelectedVideoForBackgroundRemoval] =
    useAtom(selectedVideoForBackgroundRemovalAtom);
  const [selectedVideoForExtend, setSelectedVideoForExtend] = useAtom(
    selectedVideoForExtendAtom
  );
  const [selectedVideoForVideo, setSelectedVideoForVideo] = useAtom(
    selectedVideoForVideoAtom
  );
  const [showChat, setShowChat] = useAtom(showChatAtom);
  const [showGrid, setShowGrid] = useAtom(showGridAtom);
  const [showMinimap, setShowMinimap] = useAtom(showMinimapAtom);
  const [tempApiKey, setTempApiKey] = useAtom(tempApiKeyAtom);
  const [visibleIndicators, setVisibleIndicators] = useAtom(
    visibleIndicatorsAtom
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
    croppingImageId,
    customApiKey,
    hiddenVideoControlsIds,
    isApiKeyDialogOpen,
    isExtendVideoDialogOpen,
    isImageToVideoDialogOpen,
    isRemoveVideoBackgroundDialogOpen,
    isSettingsDialogOpen,
    isStyleDialogOpen,
    isVideoToVideoDialogOpen,
    isolateInputValue,
    isolateTarget,
    selectedImageForVideo,
    selectedVideoForBackgroundRemoval,
    selectedVideoForExtend,
    selectedVideoForVideo,
    setCustomApiKey,
    setCroppingImageId,
    setHiddenVideoControlsIds,
    setIsApiKeyDialogOpen,
    setIsExtendVideoDialogOpen,
    setIsImageToVideoDialogOpen,
    setIsRemoveVideoBackgroundDialogOpen,
    setIsSettingsDialogOpen,
    setIsStyleDialogOpen,
    setIsVideoToVideoDialogOpen,
    setIsolateInputValue,
    setIsolateTarget,
    setSelectedImageForVideo,
    setSelectedVideoForBackgroundRemoval,
    setSelectedVideoForExtend,
    setSelectedVideoForVideo,
    setShowChat,
    setShowGrid,
    setShowMinimap,
    setTempApiKey,
    setVisibleIndicators,
    showChat,
    showGrid,
    showMinimap,
    tempApiKey,
    visibleIndicators,
  };
}
