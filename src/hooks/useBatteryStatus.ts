/**
 * Battery status hook using useSyncExternalStore
 * Provides efficient battery monitoring with automatic cleanup
 * Single shared subscription regardless of component count
 */

import { isErr, tryPromise } from "@/lib/errors/safe-errors";
import { logger } from "@/lib/logger";
import { useSyncExternalStore } from "react";

const log = logger.battery;

/**
 * Battery status information
 */
export interface BatteryStatus {
  /** Battery level (0-1) */
  level: number;
  /** Whether device is charging */
  charging: boolean;
  /** Whether battery API is supported */
  supported: boolean;
}

/**
 * BatteryManager interface from Battery Status API
 */
interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  addEventListener(
    type: "chargingchange" | "levelchange",
    listener: () => void
  ): void;
  removeEventListener(
    type: "chargingchange" | "levelchange",
    listener: () => void
  ): void;
}

/**
 * Navigator extension for Battery API
 */
interface NavigatorWithBattery extends Navigator {
  getBattery(): Promise<BatteryManager>;
}

// Cache for current battery status
// Updated by battery events and read by getSnapshot
let cachedBatteryStatus: BatteryStatus = {
  level: 1,
  charging: false,
  supported: false,
};

// Cache for server-side snapshot (SSR)
// IMPORTANT: Must be a stable reference to prevent infinite loops
const cachedServerSnapshot: BatteryStatus = {
  level: 1,
  charging: false,
  supported: false,
};

// Reference to battery manager for event cleanup
let batteryManager: BatteryManager | null = null;

// Track active subscriptions
let subscriberCount = 0;

/**
 * Update cached battery status from BatteryManager
 */
function updateBatteryCache(battery: BatteryManager): void {
  cachedBatteryStatus = {
    level: battery.level,
    charging: battery.charging,
    supported: true,
  };
}

/**
 * Initialize battery manager and start listening to events
 */
async function initializeBattery(): Promise<void> {
  if (typeof navigator === "undefined" || !("getBattery" in navigator)) {
    cachedBatteryStatus = { level: 1, charging: false, supported: false };
    return;
  }

  const batteryResult = await tryPromise(
    (navigator as NavigatorWithBattery).getBattery()
  );

  if (isErr(batteryResult)) {
    log.warn("Battery API not available", batteryResult.payload);
    cachedBatteryStatus = { level: 1, charging: false, supported: false };
    return;
  }

  batteryManager = batteryResult;
  updateBatteryCache(batteryManager);
}

/**
 * Subscribe to battery status changes
 * Initializes battery manager on first subscription
 */
function subscribe(callback: () => void): () => void {
  subscriberCount++;

  // Initialize on first subscription
  if (subscriberCount === 1 && !batteryManager) {
    initializeBattery().then(() => {
      if (batteryManager) {
        const handleChange = () => {
          updateBatteryCache(batteryManager!);
          callback();
        };

        batteryManager.addEventListener("levelchange", handleChange);
        batteryManager.addEventListener("chargingchange", handleChange);
      }
    });
  } else if (batteryManager) {
    // Battery manager already initialized, just notify of current state
    const handleChange = () => {
      updateBatteryCache(batteryManager!);
      callback();
    };

    batteryManager.addEventListener("levelchange", handleChange);
    batteryManager.addEventListener("chargingchange", handleChange);

    return () => {
      subscriberCount--;
      if (batteryManager) {
        batteryManager.removeEventListener("levelchange", handleChange);
        batteryManager.removeEventListener("chargingchange", handleChange);
      }
    };
  }

  return () => {
    subscriberCount--;
  };
}

/**
 * Get current battery status snapshot
 * Returns cached value to prevent infinite loops
 */
function getSnapshot(): BatteryStatus {
  return cachedBatteryStatus;
}

/**
 * Get server-side snapshot (for SSR compatibility)
 * Returns cached default battery status to prevent infinite loops
 */
function getServerSnapshot(): BatteryStatus {
  return cachedServerSnapshot;
}

/**
 * Hook to track battery status using useSyncExternalStore
 *
 * Benefits:
 * - Single battery listener shared across all components
 * - Prevents tearing in concurrent rendering
 * - Automatic subscription management
 * - SSR compatible
 * - Graceful fallback when Battery API unavailable
 *
 * @returns Current battery status
 *
 * @example
 * ```tsx
 * const battery = useBatteryStatus();
 *
 * if (!battery.supported) {
 *   return <div>Battery info unavailable</div>;
 * }
 *
 * return (
 *   <div>
 *     Battery: {Math.round(battery.level * 100)}%
 *     {battery.charging ? " (Charging)" : ""}
 *   </div>
 * );
 * ```
 *
 * @example
 * ```tsx
 * // Check for low battery
 * const battery = useBatteryStatus();
 * const isLowBattery = battery.supported &&
 *                      battery.level < 0.2 &&
 *                      !battery.charging;
 *
 * if (isLowBattery) {
 *   // Reduce performance, disable animations, etc.
 * }
 * ```
 */
export function useBatteryStatus(): BatteryStatus {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
