/**
 * Input validation and transformation utilities.
 *
 * @remarks
 * These utilities provide consistent validation patterns for common input types,
 * reducing duplication and ensuring uniform error messages.
 */

/**
 * Validates and normalizes a duration value.
 *
 * @param duration - Duration as number or string
 * @param options - Validation options
 * @returns Validated duration in seconds
 * @throws Error if duration is invalid or out of range
 */
export function validateDuration(
  duration: number | string | undefined,
  options: {
    min?: number;
    max?: number;
    default?: number;
  } = {},
): number {
  const { min = 1, max = 60, default: defaultValue = 4 } = options;

  // Parse duration if it's a string
  const parsedDuration =
    typeof duration === "string" ? Number.parseInt(duration, 10) : duration;

  // Use default if no value provided
  if (parsedDuration === undefined || parsedDuration === null) {
    return defaultValue;
  }

  // Validate it's a finite integer
  if (!Number.isFinite(parsedDuration) || parsedDuration % 1 !== 0) {
    throw new Error("Invalid duration value");
  }

  // Validate range
  if (parsedDuration < min || parsedDuration > max) {
    throw new Error(`Duration must be between ${min} and ${max} seconds`);
  }

  return parsedDuration;
}

/**
 * Validates that a required value is present.
 *
 * @param value - The value to check
 * @param fieldName - Name of the field for error messages
 * @returns The validated value
 * @throws Error if value is null or undefined
 */
export function validateRequired<T>(
  value: T | null | undefined,
  fieldName: string,
): T {
  if (value === null || value === undefined) {
    throw new Error(`${fieldName} is required`);
  }
  return value;
}

/**
 * Validates that a string is not empty after trimming.
 *
 * @param value - String value to validate
 * @param fieldName - Name of the field for error messages
 * @returns The trimmed string
 * @throws Error if string is empty or whitespace-only
 */
export function validateNonEmptyString(
  value: string | undefined,
  fieldName: string,
): string {
  if (!value || value.trim().length === 0) {
    throw new Error(`${fieldName} cannot be empty`);
  }
  return value.trim();
}

/**
 * Validates a number is within a specific range.
 *
 * @param value - Number to validate
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @param fieldName - Name of the field for error messages
 * @returns The validated number
 * @throws Error if number is out of range
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  fieldName: string,
): number {
  if (value < min || value > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}`);
  }
  return value;
}

/**
 * Converts aspect ratio string to numeric width/height ratio.
 *
 * @param aspectRatio - Aspect ratio string (e.g., "16:9", "9:16")
 * @returns Numeric ratio (width/height)
 */
export function parseAspectRatio(aspectRatio: string): number {
  const parts = aspectRatio.split(":");
  if (parts.length !== 2) {
    throw new Error(`Invalid aspect ratio format: ${aspectRatio}`);
  }

  const width = Number.parseInt(parts[0], 10);
  const height = Number.parseInt(parts[1], 10);

  if (!Number.isFinite(width) || !Number.isFinite(height) || height === 0) {
    throw new Error(`Invalid aspect ratio values: ${aspectRatio}`);
  }

  return width / height;
}

/**
 * Determines aspect ratio string from image dimensions.
 *
 * @param imageSize - Image size with width and height
 * @returns Aspect ratio string suitable for APIs ("9:16" or "16:9")
 */
export function getAspectRatioFromSize(imageSize: {
  width: number;
  height: number;
}): "9:16" | "16:9" {
  return imageSize.height > imageSize.width ? "9:16" : "16:9";
}
