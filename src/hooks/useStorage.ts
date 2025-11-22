import { PLACEHOLDER_URLS, UI_CONSTANTS } from "@/lib/constants";
import { getErrorMessage, isErr, tryPromise } from "@/lib/errors/safe-errors";
import { logger } from "@/lib/logger";
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
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Viewport } from "@/utils/viewport-utils";

const log = logger.storage;

const DEFAULT_VIEWPORT: Viewport = {
  scale: 1,
  x: 0,
  y: 0,
};

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

  // Track the last loaded project ID to prevent race conditions
  const lastLoadedProjectIdRef = useRef<string | null>(null);

  // Track the CURRENT project ID (not the one being loaded) to detect project switches during async operations
  // This ref is updated immediately when currentProject changes, allowing async operations to check if they should abort
  const currentProjectIdRef = useRef<string | null>(
    currentProject?._id ?? null
  );

  const saveToStorage = useCallback(async () => {
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

    // Process images
    for (const image of images) {
      if (image.src.startsWith(PLACEHOLDER_URLS.TRANSPARENT_GIF)) continue;

      const existingImageResult = await tryPromise(
        canvasStorage.getImage(image.id)
      );
      // If getting image fails, we might still want to try saving, or just log and continue
      // For now, let's log and proceed, assuming it might be a new image
      if (isErr(existingImageResult)) {
        log.warn("Failed to check existing image", getErrorMessage(existingImageResult));
      }
      const existingImage = isErr(existingImageResult)
        ? null
        : existingImageResult;

      // Save if new, or update if the src has changed (e.g., variation completed)
      if (!existingImage || existingImage.originalDataUrl !== image.src) {
        const saveResult = await tryPromise(
          canvasStorage.saveImage(image.src, image.id)
        );
        if (isErr(saveResult)) {
          log.error("Failed to save image locally", getErrorMessage(saveResult));
        }
      }
    }

    // Process videos
    for (const video of videos) {
      if (video.src.startsWith(PLACEHOLDER_URLS.TRANSPARENT_GIF)) continue;

      const existingVideoResult = await tryPromise(
        canvasStorage.getVideo(video.id)
      );

      if (isErr(existingVideoResult)) {
        log.warn("Failed to check existing video", getErrorMessage(existingVideoResult));
      }

      const existingVideo = isErr(existingVideoResult)
        ? null
        : existingVideoResult;

      // Save if new, or update if the src has changed (e.g., video generation completed)
      if (!existingVideo || existingVideo.originalDataUrl !== video.src) {
        const saveResult = await tryPromise(
          canvasStorage.saveVideo(video.src, video.duration, video.id)
        );

        if (isErr(saveResult)) {
          log.error("Failed to save video locally", getErrorMessage(saveResult));
        }
      }
    }

    // Save to Convex if a project is loaded
    if (currentProject?._id) {
      const saveResult = await tryPromise(
        saveProjectMutation({
          projectId: currentProject._id as Id<"projects">,
          canvasState,
        })
      );

      if (isErr(saveResult)) {
        showErrorFromException(
          "Save failed",
          saveResult.payload,
          "Could not save to cloud"
        );
      }
    }

    // Debounce hiding the saving indicator to prevent flashing UI
    // setTimeout necessary here for precise timing delay, not animation-dependent
    setTimeout(
      () => setIsSaving(false),
      UI_CONSTANTS.SAVING_INDICATOR_DELAY_MS
    );
  }, [currentProject?._id, images, saveProjectMutation, videos, viewport]);

  const loadFromStorage = useCallback(async () => {
    // Track which project we're loading to prevent race conditions
    const projectIdToLoad = currentProject?._id ?? null;

    // Skip if we've already loaded this project
    if (projectIdToLoad === lastLoadedProjectIdRef.current) {
      return;
    }

    // Clear canvas immediately when switching projects to prevent showing old content
    setImages([]);
    setVideos([]);
    setIsStorageLoaded(false);

    let canvasState: CanvasState | null = null;
    if (projectIdToLoad) {
      const projectResult = await tryPromise(
        convexClient.query(api.projects.getProject, {
          projectId: projectIdToLoad as Id<"projects">,
        })
      );

      if (isErr(projectResult)) {
        showError("Failed to load project", "Starting with a fresh canvas");
        setIsStorageLoaded(true);
        return;
      }
      const project = projectResult;
      canvasState = project?.canvasState ?? null;
    }

    // Verify we're still loading the same project (not switched again)
    // Check against the ref which holds the CURRENT project ID, not the stale closure value
    if (projectIdToLoad !== currentProjectIdRef.current) {
      return; // Project changed during load, abort
    }

    // Mark this project as loaded
    lastLoadedProjectIdRef.current = projectIdToLoad;

    if (!canvasState) {
      setImages([]);
      setVideos([]);
      setViewport(DEFAULT_VIEWPORT);
      setIsStorageLoaded(true);
      return;
    }

    // Create skeleton placeholders from canvas state for immediate display
    const skeletonImages: PlacedImage[] = [];
    const skeletonVideos: PlacedVideo[] = [];

    for (const element of canvasState.elements) {
      if (element.type === "image") {
        skeletonImages.push({
          height: element.height || 300,
          id: element.id,
          isSkeleton: true,
          rotation: element.transform.rotation,
          src: "", // Empty src for skeleton
          width: element.width || 300,
          x: element.transform.x,
          y: element.transform.y,
        });
      } else if (element.type === "video") {
        skeletonVideos.push({
          currentTime: 0,
          duration: 0,
          height: element.height || 300,
          id: element.id,
          isSkeleton: true,
          isLoaded: false,
          isPlaying: false,
          isVideo: true,
          muted: false,
          rotation: element.transform.rotation,
          src: "", // Empty src for skeleton
          volume: 1,
          width: element.width || 300,
          x: element.transform.x,
          y: element.transform.y,
        });
      }
    }

    // Display skeletons immediately for better perceived performance
    setImages(snapImagesToGrid(skeletonImages));
    setVideos(skeletonVideos);
    setViewport(canvasState.viewport ?? DEFAULT_VIEWPORT);

    // Track current state of images/videos for progressive updates
    const currentImages = [...skeletonImages];
    const currentVideos = [...skeletonVideos];

    const loadedImages: PlacedImage[] = [];
    const loadedVideos: PlacedVideo[] = [];

    // Collect unique asset IDs to batch fetch camera angles and director names
    const assetIds = new Set<string>();
    for (const element of canvasState.elements) {
      if (element.assetId) {
        assetIds.add(element.assetId);
      }
    }

    // Batch fetch assets to get camera angles and director names
    const assetMetadata = new Map<
      string,
      { cameraAngle?: string; directorName?: string }
    >();
    for (const assetId of assetIds) {
      const assetResult = await tryPromise(
        convexClient.query(api.assets.getAsset, {
          assetId: assetId as Id<"assets">,
        })
      );

      if (!isErr(assetResult)) {
        const asset = assetResult;
        if (asset?.cameraAngle || asset?.directorName) {
          assetMetadata.set(assetId, {
            cameraAngle: asset.cameraAngle,
            directorName: asset.directorName,
          });
        }
      }
    }

    // Load real images/videos and progressively replace skeletons
    for (const element of canvasState.elements) {
      if (element.type === "image") {
        const imageDataResult = await tryPromise(
          canvasStorage.getImage(element.id)
        );
        const imageData = isErr(imageDataResult) ? null : imageDataResult;

        // Verify we're still loading the same project after async operation
        // Check against the ref which holds the CURRENT project ID, not the stale closure value
        if (projectIdToLoad !== currentProjectIdRef.current) {
          return; // Project changed during load, abort
        }

        if (imageData) {
          const metadata = element.assetId
            ? assetMetadata.get(element.assetId)
            : undefined;

          const loadedImage: PlacedImage = {
            assetId: element.assetId,
            assetSyncedAt: element.assetSyncedAt,
            cameraAngle: metadata?.cameraAngle,
            directorName: metadata?.directorName,
            height: element.height || 300,
            id: element.id,
            isDirector: !!metadata?.directorName,
            rotation: element.transform.rotation,
            src: imageData.originalDataUrl,
            width: element.width || 300,
            x: element.transform.x,
            y: element.transform.y,
          };

          // Replace skeleton with real image in tracking array
          const index = currentImages.findIndex((img) => img.id === element.id);
          if (index !== -1) {
            currentImages[index] = loadedImage;
            // Update state with new array
            setImages(snapImagesToGrid([...currentImages]));
          }

          loadedImages.push(loadedImage);
        }
      } else if (element.type === "video") {
        const videoDataResult = await tryPromise(
          canvasStorage.getVideo(element.id)
        );
        const videoData = isErr(videoDataResult) ? null : videoDataResult;

        // Verify we're still loading the same project after async operation
        // Check against the ref which holds the CURRENT project ID, not the stale closure value
        if (projectIdToLoad !== currentProjectIdRef.current) {
          return; // Project changed during load, abort
        }

        if (videoData) {
          const loadedVideo: PlacedVideo = {
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
          };

          // Replace skeleton with real video in tracking array
          const index = currentVideos.findIndex((vid) => vid.id === element.id);
          if (index !== -1) {
            currentVideos[index] = loadedVideo;
            // Update state with new array
            setVideos([...currentVideos]);
          }

          loadedVideos.push(loadedVideo);
        }
      }
    }

    setIsStorageLoaded(true);
  }, [convexClient, currentProject?._id, setImages, setVideos, setViewport]);

  // Keep the current project ID ref in sync with the atom value
  // This allows async operations to check the CURRENT project (not their closure's stale value)
  useEffect(() => {
    currentProjectIdRef.current = currentProject?._id ?? null;
  }, [currentProject?._id]);

  // Load from storage when project changes
  useEffect(() => {
    void loadFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProject?._id]); // Intentionally only depend on project ID, not the callback

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
