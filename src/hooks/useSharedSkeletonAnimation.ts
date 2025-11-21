/**
 * Shared skeleton animation coordinator
 *
 * Manages a single animation loop for all skeleton shimmer effects to minimize CPU overhead.
 * Instead of each skeleton having its own requestAnimationFrame loop, all skeletons share
 * one optimized loop that calculates opacity once per frame.
 *
 * Features:
 * - Single shared animation loop for all skeletons
 * - Page Visibility API - pauses when tab is hidden
 * - Automatic cleanup when no skeletons are visible
 * - Consistent shimmer timing across all skeleton elements
 *
 * @module hooks/useSharedSkeletonAnimation
 */

import { useEffect, useState } from "react";

/**
 * Animation configuration
 */
const SHIMMER_DURATION = 1500; // 1.5 second cycle
const SHIMMER_BASE_OPACITY = 0.15;
const SHIMMER_AMPLITUDE = 0.05;
const FRAME_INTERVAL = 16; // ~60fps

/**
 * Shared skeleton animation state coordinator
 */
class SkeletonAnimationCoordinator {
  private activeCount = 0;
  private animationTimer: NodeJS.Timeout | null = null;
  private startTime = 0;
  private currentOpacity = SHIMMER_BASE_OPACITY;
  private listeners = new Set<(opacity: number) => void>();
  private isPageVisible = true;

  constructor() {
    // Listen for page visibility changes
    if (typeof document !== "undefined") {
      document.addEventListener(
        "visibilitychange",
        this.handleVisibilityChange
      );
    }
  }

  /**
   * Handle page visibility changes - pause animation when tab is hidden
   */
  private handleVisibilityChange = () => {
    this.isPageVisible = !document.hidden;

    if (this.isPageVisible && this.activeCount > 0) {
      // Tab became visible and we have active skeletons - restart animation
      this.startTime = performance.now();
      this.start();
    } else if (!this.isPageVisible) {
      // Tab hidden - stop animation to save resources
      this.stop();
    }
  };

  /**
   * Register a skeleton for animation updates
   */
  register(listener: (opacity: number) => void) {
    this.listeners.add(listener);
    this.activeCount++;

    // Immediately provide current opacity
    listener(this.currentOpacity);

    // Start animation loop if this is the first skeleton
    if (this.activeCount === 1 && this.isPageVisible) {
      this.startTime = performance.now();
      this.start();
    }
  }

  /**
   * Unregister a skeleton from animation updates
   */
  unregister(listener: (opacity: number) => void) {
    this.listeners.delete(listener);
    this.activeCount--;

    // Stop animation loop if no more skeletons are visible
    if (this.activeCount === 0) {
      this.stop();
    }
  }

  /**
   * Start the shared animation loop
   */
  private start() {
    if (this.animationTimer) return;

    const animate = () => {
      const elapsed = (performance.now() - this.startTime) % SHIMMER_DURATION;
      const progress = elapsed / SHIMMER_DURATION;
      this.currentOpacity =
        SHIMMER_BASE_OPACITY + Math.sin(progress * Math.PI * 2) * SHIMMER_AMPLITUDE;

      // Notify all listeners with the new opacity
      this.listeners.forEach((listener) => {
        listener(this.currentOpacity);
      });
    };

    this.animationTimer = setInterval(animate, FRAME_INTERVAL);
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
   * Cleanup - remove event listeners
   */
  cleanup() {
    this.stop();
    if (typeof document !== "undefined") {
      document.removeEventListener(
        "visibilitychange",
        this.handleVisibilityChange
      );
    }
  }
}

// Global singleton instance
let coordinator: SkeletonAnimationCoordinator | null = null;

/**
 * Get or create the global skeleton animation coordinator
 */
function getCoordinator(): SkeletonAnimationCoordinator {
  if (!coordinator) {
    coordinator = new SkeletonAnimationCoordinator();
  }
  return coordinator;
}

/**
 * Hook to get the shared skeleton shimmer opacity
 *
 * This hook connects to a global animation coordinator that runs a single
 * animation loop for all skeleton elements, significantly reducing CPU usage
 * when many skeletons are visible simultaneously.
 *
 * @param isActive - Whether the skeleton animation should be active
 * @returns Current shimmer opacity value (0.10 - 0.20)
 *
 * @example
 * ```typescript
 * const shimmerOpacity = useSharedSkeletonAnimation(image.isSkeleton);
 *
 * return (
 *   <Rect
 *     fill="#2a2a2a"
 *     opacity={shimmerOpacity}
 *   />
 * );
 * ```
 */
export function useSharedSkeletonAnimation(isActive: boolean): number {
  const [opacity, setOpacity] = useState(SHIMMER_BASE_OPACITY);

  useEffect(() => {
    if (!isActive) {
      setOpacity(SHIMMER_BASE_OPACITY);
      return;
    }

    const coord = getCoordinator();
    coord.register(setOpacity);

    return () => {
      coord.unregister(setOpacity);
    };
  }, [isActive]);

  return opacity;
}
