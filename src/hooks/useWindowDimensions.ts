/**
 * Window dimensions hook using useSyncExternalStore
 * Provides efficient window size tracking with automatic cleanup
 * Single shared subscription regardless of component count
 */

import { useSyncExternalStore } from "react";

export interface WindowDimensions {
  width: number;
  height: number;
}

// Cache for current window dimensions
// This is updated on resize and read by getSnapshot
let cachedDimensions: WindowDimensions = {
  width: typeof window !== "undefined" ? window.innerWidth : 1200,
  height: typeof window !== "undefined" ? window.innerHeight : 800,
};

// Cache for server-side snapshot (SSR)
// IMPORTANT: Must be a stable reference to prevent infinite loops
const cachedServerSnapshot: WindowDimensions = {
  width: 1200,
  height: 800,
};

/**
 * Subscribe to window resize events
 * This function is shared across all hook instances for optimal performance
 */
function subscribe(callback: () => void): () => void {
  const handleResize = () => {
    // Update cache when window resizes
    cachedDimensions = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    callback?.();
  };

  window.addEventListener("resize", handleResize);
  return () => window.removeEventListener("resize", handleResize);
}

/**
 * Get current window dimensions snapshot
 * Returns cached value to prevent infinite loops
 */
function getSnapshot(): WindowDimensions {
  return cachedDimensions;
}

/**
 * Get server-side snapshot (for SSR compatibility)
 * Returns cached default dimensions to prevent infinite loops
 */
function getServerSnapshot(): WindowDimensions {
  return cachedServerSnapshot;
}

/**
 * Hook to track window dimensions using useSyncExternalStore
 *
 * Benefits over traditional useEffect + useState:
 * - Single resize listener shared across all components
 * - Prevents tearing in concurrent rendering
 * - Automatic subscription management
 * - SSR compatible
 *
 * @returns Current window dimensions
 *
 * @example
 * ```tsx
 * const { width, height } = useWindowDimensions();
 * console.log(`Window: ${width}x${height}`);
 * ```
 */
export function useWindowDimensions(): WindowDimensions {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
