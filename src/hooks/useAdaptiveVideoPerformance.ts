/**
 * Adaptive video performance monitoring
 *
 * Automatically detects device performance and adjusts video rendering quality.
 * Monitors frame timing and CPU usage patterns to prevent lag and stuttering.
 *
 * Features:
 * - Automatic FPS reduction when device struggles
 * - Recovery to higher FPS when performance improves
 * - Battery status detection (reduces FPS on low battery)
 * - Hardware concurrency detection (adjusts for low-core devices)
 *
 * Now uses useSyncExternalStore for battery monitoring.
 *
 * @module hooks/useAdaptiveVideoPerformance
 */

import { useVideoPerformanceMode } from "@/hooks/useSharedVideoAnimation";
import { useEffect, useRef, useState } from "react";
import { useBatteryStatus } from "./useBatteryStatus";

/**
 * Performance thresholds for automatic quality adjustment
 */
const PERFORMANCE_THRESHOLDS = {
  /** Frame time in ms that triggers quality reduction */
  SLOW_FRAME_THRESHOLD: 100,
  /** Number of slow frames before reducing quality */
  SLOW_FRAME_COUNT: 5,
  /** Battery level that triggers low power mode */
  LOW_BATTERY_THRESHOLD: 0.2,
  /** Minimum CPU cores for high quality */
  MIN_CORES_FOR_HIGH: 8,
  /** Minimum CPU cores for medium quality */
  MIN_CORES_FOR_MEDIUM: 4,
} as const;

/**
 * Detect device capabilities
 */
function detectDeviceCapabilities(): "high" | "medium" | "low" {
  if (typeof navigator === "undefined") return "medium";

  // Check hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 4;

  if (cores >= PERFORMANCE_THRESHOLDS.MIN_CORES_FOR_HIGH) {
    return "high";
  } else if (cores >= PERFORMANCE_THRESHOLDS.MIN_CORES_FOR_MEDIUM) {
    return "medium";
  } else {
    return "low";
  }
}


/**
 * Monitor frame performance and adjust quality
 */
function useFramePerformanceMonitoring(
  activeVideoCount: number,
  onPerformanceDrop: () => void,
  onPerformanceRecovered: () => void,
) {
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const slowFrameCountRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeVideoCount === 0) return;

    const measureFrame = (timestamp: number) => {
      const delta = timestamp - lastFrameTimeRef.current;
      lastFrameTimeRef.current = timestamp;

      // Track frame times
      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 30) {
        frameTimesRef.current.shift();
      }

      // Detect slow frames
      if (delta > PERFORMANCE_THRESHOLDS.SLOW_FRAME_THRESHOLD) {
        slowFrameCountRef.current++;

        if (
          slowFrameCountRef.current >= PERFORMANCE_THRESHOLDS.SLOW_FRAME_COUNT
        ) {
          onPerformanceDrop();
          slowFrameCountRef.current = 0; // Reset after triggering
        }
      } else {
        // Reset slow frame count if we have good frames
        if (slowFrameCountRef.current > 0) {
          slowFrameCountRef.current = Math.max(
            0,
            slowFrameCountRef.current - 1,
          );
        }

        // Check if performance has consistently recovered
        if (frameTimesRef.current.length >= 30) {
          const avgFrameTime =
            frameTimesRef.current.reduce((a, b) => a + b, 0) /
            frameTimesRef.current.length;

          if (avgFrameTime < PERFORMANCE_THRESHOLDS.SLOW_FRAME_THRESHOLD / 2) {
            onPerformanceRecovered();
          }
        }
      }

      rafIdRef.current = requestAnimationFrame(measureFrame);
    };

    rafIdRef.current = requestAnimationFrame(measureFrame);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [activeVideoCount, onPerformanceDrop, onPerformanceRecovered]);
}

/**
 * Hook to enable adaptive video performance
 *
 * Automatically adjusts video rendering quality based on:
 * - Device hardware capabilities
 * - Battery level
 * - Real-time frame performance
 * - Number of active videos
 *
 * @param activeVideoCount - Number of currently playing videos
 * @param enabled - Whether adaptive performance is enabled (default: true)
 *
 * @example
 * ```typescript
 * // In a canvas component that knows about playing videos
 * const playingCount = videos.filter(v => v.isPlaying).length;
 * const currentMode = useAdaptiveVideoPerformance(playingCount);
 * ```
 */
export function useAdaptiveVideoPerformance(
  activeVideoCount: number,
  enabled = true,
): "high" | "medium" | "low" {
  const [currentMode, setCurrentMode] = useState<"high" | "medium" | "low">(
    () => detectDeviceCapabilities(),
  );
  const baselineMode = useRef(detectDeviceCapabilities());

  // Use external store for battery monitoring (single shared subscription)
  const battery = useBatteryStatus();

  // Determine if device is in low power mode
  const isLowPowerMode =
    battery.supported &&
    battery.level < PERFORMANCE_THRESHOLDS.LOW_BATTERY_THRESHOLD &&
    !battery.charging;

  // Frame performance monitoring
  useFramePerformanceMonitoring(
    activeVideoCount,
    // Performance drop - reduce quality
    () => {
      setCurrentMode((current) => {
        if (current === "high") return "medium";
        if (current === "medium") return "low";
        return current;
      });
    },
    // Performance recovered - increase quality (but not above baseline)
    () => {
      setCurrentMode((current) => {
        const baseline = baselineMode.current;
        if (current === "low" && baseline !== "low") return "medium";
        if (current === "medium" && baseline === "high") return "high";
        return current;
      });
    },
  );

  // Apply low power mode if battery is low
  useEffect(() => {
    if (isLowPowerMode) {
      setCurrentMode("low");
    } else {
      setCurrentMode(baselineMode.current);
    }
  }, [isLowPowerMode]);

  // Apply performance mode to video coordinator
  useVideoPerformanceMode(enabled ? currentMode : baselineMode.current);

  return currentMode;
}
