import { useToast } from "@/hooks/use-toast";
import { PLACEHOLDER_URLS, UI_CONSTANTS } from "@/lib/constants";
import { canvasStorage } from "@/lib/storage";
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
  const { toast } = useToast();


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
        if (!existingImage) {
          await canvasStorage.saveImage(image.src, image.id);
        }
      }

      for (const video of videos) {
        if (video.src.startsWith(PLACEHOLDER_URLS.TRANSPARENT_GIF)) continue;

        const existingVideo = await canvasStorage.getVideo(video.id);
        if (!existingVideo) {
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
          toast({
            title: "Save failed",
            description:
              err instanceof Error ? err.message : "Could not save to cloud",
            variant: "destructive",
          });
        }
      }

      // Debounce hiding the saving indicator to prevent flashing UI
      // setTimeout necessary here for precise timing delay, not animation-dependent
      setTimeout(
        () => setIsSaving(false),
        UI_CONSTANTS.SAVING_INDICATOR_DELAY_MS
      );
    } catch (error) {
      console.error("Failed to save to storage:", error);
      setIsSaving(false);
    }
  }, [currentProject?._id, images, toast, videos, viewport]);

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
        if (element.type === "image" && element.assetId) {
          const imageData = await canvasStorage.getImage(element.assetId);
          if (imageData) {
            loadedImages.push({
              height: element.height || 300,
              id: element.id,
              rotation: element.transform.rotation,
              src: imageData.originalDataUrl,
              width: element.width || 300,
              x: element.transform.x,
              y: element.transform.y,
            });
          }
        } else if (element.type === "video" && element.assetId) {
          const videoData = await canvasStorage.getVideo(element.assetId);
          if (videoData) {
            loadedVideos.push({
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
      console.error("Failed to load from storage:", error);
      toast({
        description: "Starting with a fresh canvas",
        title: "Failed to restore canvas",
        variant: "destructive",
      });
    } finally {
      setIsStorageLoaded(true);
    }
  }, [convexClient, currentProject?._id, setImages, setVideos, setViewport, toast]);

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
    isStorageLoaded,
    isSaving,
    saveToStorage,
    loadFromStorage,
  };
}
