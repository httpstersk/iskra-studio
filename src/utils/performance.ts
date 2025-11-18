/**
 * Performance optimization utilities
 *
 * This module provides utilities for optimizing function execution timing,
 * including debouncing, throttling, and requestAnimationFrame-based throttling
 * for smoother animations and reduced computational overhead.
 *
 * @module performance
 */

/**
 * Creates a debounced version of a function that delays execution until
 * after the specified delay has elapsed since the last call.
 *
 * Useful for expensive operations that shouldn't be called too frequently,
 * such as search input handlers, resize handlers, or auto-save functionality.
 *
 * @template T - Function type to debounce
 * @param func - Function to debounce
 * @param delay - Delay in milliseconds to wait before executing
 * @returns Debounced version of the function
 *
 */
export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Creates a throttled version of a function that executes at most once
 * per specified time limit. The function will execute immediately on the
 * first call, then ignore subsequent calls until the limit has passed.
 *
 * Useful for rate-limiting event handlers like scroll, mousemove, or
 * drag events that fire rapidly.
 *
 * @template T - Function type to throttle
 * @param func - Function to throttle
 * @param limit - Minimum time in milliseconds between executions
 * @returns Throttled version of the function
 *
 */
export function throttle<T extends (...args: never[]) => unknown>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;

    if (timeSinceLastCall >= limit) {
      // Execute immediately if enough time has passed
      lastCall = now;
      func(...args);
    } else {
      // Schedule for later if we're still in throttle window
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        func(...args);
        timeoutId = null;
      }, limit - timeSinceLastCall);
    }
  };
}

/**
 * Creates a requestAnimationFrame-based throttled function that executes
 * synchronized with the browser's repaint cycle (~60fps = ~16.67ms per frame).
 *
 * This is optimal for animation-related updates and visual changes as it
 * automatically syncs with the browser's rendering, preventing unnecessary
 * calculations between frames and ensuring smooth animations.
 *
 * @template T - Function type to throttle
 * @param func - Function to throttle
 * @returns RAF-throttled version of the function
 *
 * @example
 * ```typescript
 * const updatePosition = throttleRAF((x: number, y: number) => {
 *   element.style.transform = `translate(${x}px, ${y}px)`;
 * });
 *
 * element.addEventListener('mousemove', (e) => {
 *   updatePosition(e.clientX, e.clientY);
 * });
 * // Will execute at most once per animation frame (~60fps)
 * ```
 */
export function throttleRAF<T extends (...args: never[]) => unknown>(
  func: T,
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  let lastArgs: Parameters<T> | null = null;

  return function (...args: Parameters<T>) {
    lastArgs = args;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (lastArgs !== null) {
          func(...lastArgs);
          lastArgs = null;
        }
        rafId = null;
      });
    }
  };
}
