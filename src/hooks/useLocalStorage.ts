/**
 * localStorage hook using useSyncExternalStore
 * Provides efficient localStorage access with cross-tab synchronization
 * Automatically subscribes to storage events for multi-tab support
 */

import { isErr, trySync } from "@/lib/errors/safe-errors";
import { useCallback, useMemo, useSyncExternalStore } from "react";

// Module-level cache for localStorage values
// Prevents infinite loops by maintaining stable snapshot references
const storageCache = new Map<string, unknown>();

/**
 * Parse stored value with type safety
 */
function parseStoredValue<T>(key: string, defaultValue: T): T {
  if (typeof window === "undefined") {
    return defaultValue;
  }

  const itemResult = trySync(() => window.localStorage.getItem(key));
  if (isErr(itemResult)) {
    console.warn(
      `Error reading localStorage key "${key}":`,
      itemResult.payload
    );
    return defaultValue;
  }
  const item = itemResult;

  if (item === null) {
    return defaultValue;
  }

  // Handle boolean strings
  if (typeof defaultValue === "boolean") {
    return (item === "true") as T;
  }

  // Handle numbers
  if (typeof defaultValue === "number") {
    const parsed = parseFloat(item);
    return (isNaN(parsed) ? defaultValue : parsed) as T;
  }

  // Handle JSON objects/arrays
  if (typeof defaultValue === "object") {
    const jsonResult = trySync(() => JSON.parse(item));
    if (isErr(jsonResult)) {
      console.warn(`Error parsing JSON for key "${key}":`, jsonResult.payload);
      return defaultValue;
    }
    return jsonResult as T;
  }

  // Handle strings
  return item as T;
}

/**
 * Serialize value for storage
 */
function serializeValue<T>(value: T): string {
  if (typeof value === "boolean" || typeof value === "number") {
    return value.toString();
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Update cache for a given key
 */
function updateCache<T>(key: string, defaultValue: T): void {
  const newValue = parseStoredValue(key, defaultValue);
  storageCache.set(key, newValue);
}

/**
 * Get cached value or initialize it
 */
function getCachedValue<T>(key: string, defaultValue: T): T {
  if (!storageCache.has(key)) {
    updateCache(key, defaultValue);
  }
  return storageCache.get(key) as T;
}

/**
 * Hook to manage localStorage state with useSyncExternalStore
 *
 * Benefits:
 * - Single source of truth with localStorage
 * - Automatic cross-tab synchronization via storage events
 * - Prevents tearing in concurrent rendering
 * - Type-safe with TypeScript
 * - SSR compatible
 * - Cached snapshots prevent infinite loops
 *
 * @param key - localStorage key
 * @param defaultValue - Default value if key doesn't exist
 * @returns [value, setValue] tuple
 *
 * @example
 * ```tsx
 * const [showGrid, setShowGrid] = useLocalStorage("showGrid", true);
 *
 * <button onClick={() => setShowGrid(!showGrid)}>
 *   Toggle Grid: {showGrid ? "On" : "Off"}
 * </button>
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize cache for this key if not exists
  // This happens once per key to establish the cached value
  if (!storageCache.has(key)) {
    updateCache(key, defaultValue);
  }

  // Create stable store configuration using useMemo
  // This prevents infinite loops by ensuring functions don't change on every render
  const storeConfig = useMemo(() => {
    // Subscribe to storage events for cross-tab synchronization
    const subscribe = (callback: () => void) => {
      // Listen for storage events from other tabs
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === key || e.key === null) {
          // Update cache when storage changes
          updateCache(key, defaultValue);
          callback();
        }
      };

      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    };

    // Get current snapshot from cache
    // This returns the cached value to prevent infinite loops
    const getSnapshot = () => getCachedValue(key, defaultValue);

    // Get server snapshot (for SSR)
    // IMPORTANT: Returns cached value, not defaultValue directly
    // This prevents infinite loops if defaultValue is a new object/array reference
    const getServerSnapshot = () => getCachedValue(key, defaultValue);

    return { subscribe, getSnapshot, getServerSnapshot };
    // Only depend on key, not defaultValue, to keep functions stable
    // defaultValue is captured in closure and used to initialize cache
    // This prevents infinite loops when defaultValue is a new object/array reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Subscribe to external store
  const value = useSyncExternalStore(
    storeConfig.subscribe,
    storeConfig.getSnapshot,
    storeConfig.getServerSnapshot
  );

  // Setter function with support for functional updates
  const setValue = useCallback(
    (newValue: T | ((prev: T) => T)) => {
      const result = trySync(() => {
        // Handle functional updates
        const currentValue = getCachedValue(key, defaultValue);
        const valueToStore =
          newValue instanceof Function ? newValue(currentValue) : newValue;

        // Save to localStorage
        window.localStorage.setItem(key, serializeValue(valueToStore));

        // Update cache immediately
        storageCache.set(key, valueToStore);

        // Dispatch custom event to notify other instances in same tab
        // Note: storage event only fires for OTHER tabs, not the current one
        window.dispatchEvent(
          new StorageEvent("storage", {
            key,
            newValue: serializeValue(valueToStore),
            storageArea: window.localStorage,
          })
        );
      });

      if (isErr(result)) {
        console.warn(
          `Error setting localStorage key "${key}":`,
          result.payload
        );
      }
    },
    [key, defaultValue]
  );

  return [value, setValue];
}

/**
 * Hook to read localStorage value without setter
 * Useful when you only need to observe a value
 *
 * @param key - localStorage key
 * @param defaultValue - Default value if key doesn't exist
 * @returns Current value from localStorage
 *
 * @example
 * ```tsx
 * const theme = useLocalStorageValue("theme", "light");
 * ```
 */
export function useLocalStorageValue<T>(key: string, defaultValue: T): T {
  const [value] = useLocalStorage(key, defaultValue);
  return value;
}
