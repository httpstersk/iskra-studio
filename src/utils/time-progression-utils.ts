/**
 * Time Progression Utilities
 * Handles exponential time progression for storyline mode
 */

/**
 * Calculates exponential time progression for storyline images
 * Base progression: 1, 5, 25, 125, 625 minutes (5x multiplier)
 * 
 * @param index - Zero-based index of the image in the sequence
 * @param baseMinutes - Base time unit in minutes (default: 1)
 * @returns Time elapsed in minutes
 * 
 * @example
 * calculateTimeProgression(0) // 1 minute
 * calculateTimeProgression(1) // 5 minutes
 * calculateTimeProgression(2) // 25 minutes
 * calculateTimeProgression(3) // 125 minutes (2h5m)
 */
export function calculateTimeProgression(
  index: number,
  baseMinutes: number = 1
): number {
  return baseMinutes * Math.pow(5, index);
}

/**
 * Formats time progression into human-readable label
 * 
 * @param minutes - Time in minutes
 * @returns Formatted string (e.g., "+1min", "+2h5m", "+54d")
 * 
 * @example
 * formatTimeLabel(1) // "+1min"
 * formatTimeLabel(125) // "+2h5m"
 * formatTimeLabel(1440) // "+1d"
 */
export function formatTimeLabel(minutes: number): string {
  // Less than 60 minutes
  if (minutes < 60) {
    return `+${minutes}min`;
  }

  // Less than 24 hours
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `+${hours}h${mins}m` : `+${hours}h`;
  }

  // Days
  const days = Math.floor(minutes / 1440);
  const remainingHours = Math.floor((minutes % 1440) / 60);
  
  if (remainingHours > 0) {
    return `+${days}d${remainingHours}h`;
  }
  
  return `+${days}d`;
}

/**
 * Gets time progression details for a sequence of images
 * 
 * @param count - Number of images in the sequence
 * @returns Array of time progression details
 */
export function getTimeProgressionSequence(count: number): Array<{
  index: number;
  minutes: number;
  label: string;
}> {
  return Array.from({ length: count }, (_, index) => {
    const minutes = calculateTimeProgression(index);
    return {
      index,
      minutes,
      label: formatTimeLabel(minutes),
    };
  });
}
