/**
 * Grid snap utilities for canvas elements
 */

const GRID_SIZE = 12; // 12px grid increment

/**
 * Snaps a value to the nearest grid increment
 */
export const snapToGrid = (value: number, gridSize: number = GRID_SIZE): number => {
  return Math.round(value / gridSize) * gridSize;
};

/**
 * Snaps x and y coordinates to the grid
 */
export const snapPosition = (
  x: number,
  y: number,
  gridSize: number = GRID_SIZE
): { x: number; y: number } => {
  return {
    x: snapToGrid(x, gridSize),
    y: snapToGrid(y, gridSize),
  };
};

/**
 * Checks if haptic feedback is available in the browser
 */
const isHapticAvailable = (): boolean => {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
};

/**
 * Triggers a subtle haptic feedback pulse
 * Only works on devices that support the Vibration API
 */
export const triggerSnapHaptic = (): void => {
  if (isHapticAvailable()) {
    // Short 10ms pulse for subtle feedback
    navigator.vibrate(10);
  }
};

/**
 * Hook to track last snapped position and trigger haptic feedback on snap
 */
export const useSnapFeedback = () => {
  let lastSnappedX: number | null = null;
  let lastSnappedY: number | null = null;

  return (x: number, y: number) => {
    const snapped = snapPosition(x, y);
    
    // Trigger haptic feedback if position changed after snapping
    if (
      (lastSnappedX !== null && lastSnappedX !== snapped.x) ||
      (lastSnappedY !== null && lastSnappedY !== snapped.y)
    ) {
      triggerSnapHaptic();
    }
    
    lastSnappedX = snapped.x;
    lastSnappedY = snapped.y;
    
    return snapped;
  };
};
