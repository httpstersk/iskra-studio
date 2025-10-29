import { PLACEHOLDER_URLS, UI_CONSTANTS } from "@/lib/constants";
import { canvasStorage } from "@/lib/storage";
import { showError, showErrorFromException } from "@/lib/toast";
import { currentProjectAtom } from "@/store/project-atoms";
import type { PlacedImage, PlacedVideo } from "@/types/canvas";
import type { CanvasState } from "@/types/project";
import {
  imageToCanvasElement,
  videoToCanvasElement,
} from "@/utils/canvas-utils";
import { snapImagesToGrid } from "@/utils/snap-utils";
import { useConvex, useMutation } from "convex/react";
import { useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Viewport } from "./useCanvasState";

export function useStorage(
  images: PlacedImage[],
  videos: PlacedVideo[],
  viewport: Viewport,
  setImages: (images: PlacedImage[]) => void,
  setVideos: (videos: PlacedVideo[]) => void,
  setViewport: (viewport: Viewport) => void,
  activeGenerationsSize: number
) {
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const convexClient = useConvex();
  const saveProjectMutation = useMutation(api.projects.saveProject);
  const currentProject = useAtomValue(currentProjectAtom);

  const saveToStorage = useCallback(async () => {
    try {
      setIsSaving(true);
      const canvasState: CanvasState = {
        elements: [
          ...images.map(imageToCanvasElement),
          ...videos.map(videoToCanvasElement),
        ],
        backgroundColor: "#000",
        lastModified: Date.now(),
        viewport,
      };

      for (const image of images) {
        if (image.src.startsWith(PLACEHOLDER_URLS.TRANSPARENT_GIF)) continue;

        const existingImage = await canvasStorage.getImage(image.id);
        // Save if new, or update if the src has changed (e.g., variation completed)
        if (!existingImage || existingImage.originalDataUrl !== image.src) {
          await canvasStorage.saveImage(image.src, image.id);
        }
      }

      for (const video of videos) {
        if (video.src.startsWith(PLACEHOLDER_URLS.TRANSPARENT_GIF)) continue;

        const existingVideo = await canvasStorage.getVideo(video.id);
        // Save if new, or update if the src has changed (e.g., video generation completed)
        if (!existingVideo || existingVideo.originalDataUrl !== video.src) {
          await canvasStorage.saveVideo(video.src, video.duration, video.id);
        }
      }

      // Save to Convex if a project is loaded
      if (currentProject?._id) {
        try {
          await saveProjectMutation({
            projectId: currentProject._id as Id<"projects">,
            canvasState,
          });
        } catch (err) {
          showErrorFromException("Save failed", err, "Could not save to cloud");
        }
      }

      // Debounce hiding the saving indicator to prevent flashing UI
      // setTimeout necessary here for precise timing delay, not animation-dependent
      setTimeout(
        () => setIsSaving(false),
        UI_CONSTANTS.SAVING_INDICATOR_DELAY_MS
      );
    } catch (error) {
      setIsSaving(false);
    }
  }, [currentProject?._id, images, saveProjectMutation, videos, viewport]);

  const loadFromStorage = useCallback(async () => {
    try {
      let canvasState: CanvasState | null = null;
      if (currentProject?._id) {
        const project = await convexClient.query(api.projects.getProject, {
          projectId: currentProject._id as Id<"projects">,
        });
        canvasState = project?.canvasState ?? null;
      }

      if (!canvasState) {
        setIsStorageLoaded(true);
        return;
      }

      const loadedImages: PlacedImage[] = [];
      const loadedVideos: PlacedVideo[] = [];

      for (const element of canvasState.elements) {
        if (element.type === "image") {
          const imageData = await canvasStorage.getImage(element.id);

          if (imageData) {
            loadedImages.push({
              assetId: element.assetId,
              assetSyncedAt: element.assetSyncedAt,
              height: element.height || 300,
              id: element.id,
              rotation: element.transform.rotation,
              src: imageData.originalDataUrl,
              width: element.width || 300,
              x: element.transform.x,
              y: element.transform.y,
            });
          }
        } else if (element.type === "video") {
          const videoData = await canvasStorage.getVideo(element.id);

          if (videoData) {
            loadedVideos.push({
              assetId: element.assetId,
              assetSyncedAt: element.assetSyncedAt,
              currentTime: element.currentTime || 0,
              duration: element.duration || videoData.duration,
              height: element.height || 300,
              id: element.id,
              isLoaded: false,
              isPlaying: element.isPlaying || false,
              isVideo: true,
              muted: element.muted || false,
              rotation: element.transform.rotation,
              src: videoData.originalDataUrl,
              volume: element.volume || 1,
              width: element.width || 300,
              x: element.transform.x,
              y: element.transform.y,
            });
          }
        }
      }

      if (loadedImages.length > 0) {
        setImages(snapImagesToGrid(loadedImages));
      }

      if (loadedVideos.length > 0) {
        setVideos(loadedVideos);
      }

      if (canvasState.viewport) setViewport(canvasState.viewport);
    } catch (error) {
      showError("Failed to restore canvas", "Starting with a fresh canvas");
    } finally {
      setIsStorageLoaded(true);
    }
  }, [convexClient, currentProject?._id, setImages, setVideos, setViewport]);

  // Load from storage on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Auto-save to storage when images change (with debounce)
  useEffect(() => {
    if (!isStorageLoaded) return;
    if (activeGenerationsSize > 0) return;

    // setTimeout necessary here for debouncing save operations with precise timing
    const timeoutId = setTimeout(() => {
      void saveToStorage();
    }, UI_CONSTANTS.STORAGE_SAVE_DEBOUNCE_MS);

    return () => clearTimeout(timeoutId);
  }, [
    activeGenerationsSize,
    images,
    isStorageLoaded,
    saveToStorage,
    videos,
    viewport,
  ]);

  return {
    isSaving,
    isStorageLoaded,
    loadFromStorage,
    saveToStorage,
  };
}
