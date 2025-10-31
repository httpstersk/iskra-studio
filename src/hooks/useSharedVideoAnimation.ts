/**
 * Shared video animation coordinator
 *
 * Manages a single animation loop for all videos on the canvas to minimize CPU overhead.
 * Instead of each video having its own setInterval, all videos share one optimized loop.
 *
 * Features:
 * - Single shared animation loop for all videos
 * - Page Visibility API - pauses/reduces FPS when tab is hidden
 * - Adaptive FPS - adjusts based on device performance
 * - Automatic cleanup when no videos are playing
 *
 * @module hooks/useSharedVideoAnimation
 */

import { DEFAULT_VIDEO_FPS_INTERVAL, FPS_PRESETS } from "@/constants/video-performance";
import type Konva from "konva";
import { useEffect, useRef } from "react";

/**
 * Shared animation state across all video instances
 */
class VideoAnimationCoordinator {
  private activeNodes = new Set<Konva.Image>();
  private animationTimer: NodeJS.Timeout | null = null;
  private currentFPS = DEFAULT_VIDEO_FPS_INTERVAL;
  private isPageVisible = true;
  private performanceMode: "high" | "medium" | "low" = "medium";

  constructor() {
    // Listen for page visibility changes
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.handleVisibilityChange);
    }
  }

  /**
   * Handle page visibility changes - reduce FPS when tab is hidden
   */
  private handleVisibilityChange = () => {
    this.isPageVisible = !document.hidden;
    
    if (!this.isPageVisible) {
      // Tab hidden - use low FPS to save battery
      this.currentFPS = FPS_PRESETS.low;
    } else {
      // Tab visible - restore normal FPS based on performance mode
      this.currentFPS = FPS_PRESETS[this.performanceMode];
    }

    // Restart timer with new FPS
    if (this.animationTimer && this.activeNodes.size > 0) {
      this.stop();
      this.start();
    }
  };

  /**
   * Register a video node for animation
   */
  register(node: Konva.Image) {
    const wasEmpty = this.activeNodes.size === 0;
    this.activeNodes.add(node);

    // Start animation loop if this is the first video
    if (wasEmpty) {
      this.start();
    }
  }

  /**
   * Unregister a video node from animation
   */
  unregister(node: Konva.Image) {
    this.activeNodes.delete(node);

    // Stop animation loop if no more videos are playing
    if (this.activeNodes.size === 0) {
      this.stop();
    }
  }

  /**
   * Start the shared animation loop
   */
  private start() {
    if (this.animationTimer) return;

    // Collect unique layers to minimize redraws
    const animate = () => {
      const layers = new Set<Konva.Layer>();
      
      // Collect all unique layers from active nodes
      this.activeNodes.forEach((node) => {
        const layer = node.getLayer();
        if (layer) {
          layers.add(layer);
        }
      });

      // Batch draw all layers - this is the key optimization
      // Instead of drawing each video separately, we draw each layer once
      layers.forEach((layer) => {
        layer.batchDraw();
      });
    };

    this.animationTimer = setInterval(animate, this.currentFPS);
  }

  /**
   * Stop the shared animation loop
   */
  private stop() {
    if (this.animationTimer) {
      clearInterval(this.animationTimer);
      this.animationTimer = null;
    }
  }

  /**
   * Set performance mode (for future adaptive FPS)
   */
  setPerformanceMode(mode: "high" | "medium" | "low") {
    this.performanceMode = mode;
    
    // Only update FPS if page is currently visible
    if (this.isPageVisible) {
      this.currentFPS = FPS_PRESETS[mode];
      
      // Restart timer with new FPS if running
      if (this.animationTimer && this.activeNodes.size > 0) {
        this.stop();
        this.start();
      }
    }
  }

  /**
   * Cleanup - remove event listeners
   */
  cleanup() {
    this.stop();
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibilityChange);
    }
  }
}

// Global singleton instance
let coordinator: VideoAnimationCoordinator | null = null;

/**
 * Get or create the global video animation coordinator
 */
function getCoordinator(): VideoAnimationCoordinator {
  if (!coordinator) {
    coordinator = new VideoAnimationCoordinator();
  }
  return coordinator;
}

/**
 * Hook to register a video node with the shared animation coordinator
 * 
 * @param shapeRef - Reference to the Konva Image node
 * @param isPlaying - Whether the video is currently playing
 * @param videoSrc - Video source URL (used for change detection)
 * 
 * @example
 * ```typescript
 * const shapeRef = useRef<Konva.Image>(null);
 * useSharedVideoAnimation(shapeRef, video.isPlaying, video.src);
 * ```
 */
export function useSharedVideoAnimation(
  shapeRef: React.RefObject<Konva.Image | null>,
  isPlaying: boolean,
  videoSrc: string
) {
  const coordinatorRef = useRef<VideoAnimationCoordinator | null>(null);

  useEffect(() => {
    coordinatorRef.current = getCoordinator();
  }, []);

  useEffect(() => {
    const node = shapeRef.current;
    const coord = coordinatorRef.current;

    if (!node || !coord) return;

    if (isPlaying) {
      coord.register(node);
      return () => {
        coord.unregister(node);
      };
    } else {
      coord.unregister(node);
    }
  }, [isPlaying, videoSrc, shapeRef]);
}

/**
 * Hook to set the global performance mode for all videos
 * 
 * @param mode - Performance mode: "high" (50 FPS), "medium" (30 FPS), "low" (15 FPS)
 * 
 * @example
 * ```typescript
 * // In a settings component
 * useVideoPerformanceMode(userSettings.videoQuality);
 * ```
 */
export function useVideoPerformanceMode(mode: "high" | "medium" | "low") {
  useEffect(() => {
    const coord = getCoordinator();
    coord.setPerformanceMode(mode);
  }, [mode]);
}
