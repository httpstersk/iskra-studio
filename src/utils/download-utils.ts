/**
 * Utility functions for downloading files and creating zip archives
 */

import JSZip from "jszip";
import type { PlacedImage } from "@/types/canvas";

/**
 * Constants for download operations
 */
const DOWNLOAD_CONSTANTS = {
  DEFAULT_FILENAME: "spark-images",
  FILE_EXTENSION: ".zip",
  FETCH_TIMEOUT: 30000,
  IMAGE_FOLDER: "images",
} as const;

/**
 * Error messages for download operations
 */
const DOWNLOAD_ERROR_MESSAGES = {
  FAILED_TO_CREATE_ZIP: "Failed to create zip archive",
  FAILED_TO_FETCH: "Failed to fetch image",
  NO_IMAGES_SELECTED: "No images selected to download",
} as const;

/**
 * Fetches an image from a URL and returns it as a Blob
 *
 * @param url - The URL of the image to fetch
 * @returns Promise resolving to the image Blob
 */
const fetchImageAsBlob = async (url: string): Promise<Blob> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    DOWNLOAD_CONSTANTS.FETCH_TIMEOUT
  );

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    return blob;
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Extracts a filename from a URL or generates a default one
 *
 * @param url - The URL to extract filename from
 * @param index - Index for generating unique filenames
 * @returns The extracted or generated filename
 */
const getFilenameFromUrl = (url: string, index: number): string => {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split("/").pop();

    if (filename && filename.includes(".")) {
      return filename;
    }

    // Generate filename based on URL or index
    const extension = url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)?.[0] || ".jpg";
    return `image-${index + 1}${extension}`;
  } catch {
    // If URL parsing fails, use index-based naming
    return `image-${index + 1}.jpg`;
  }
};

/**
 * Downloads multiple images as a zip file
 *
 * @param images - Array of PlacedImage objects to download
 * @param selectedIds - Array of selected image IDs
 * @returns Promise resolving when download is complete
 */
export const downloadImagesAsZip = async (
  images: PlacedImage[],
  selectedIds: string[]
): Promise<void> => {
  // Filter selected images
  const selectedImages = images.filter((img) => selectedIds.includes(img.id));

  if (selectedImages.length === 0) {
    throw new Error(DOWNLOAD_ERROR_MESSAGES.NO_IMAGES_SELECTED);
  }

  try {
    const zip = new JSZip();
    const folder = zip.folder(DOWNLOAD_CONSTANTS.IMAGE_FOLDER);

    if (!folder) {
      throw new Error(DOWNLOAD_ERROR_MESSAGES.FAILED_TO_CREATE_ZIP);
    }

    // Fetch all images in parallel
    const imagePromises = selectedImages.map(async (image, index) => {
      try {
        const blob = await fetchImageAsBlob(image.src);
        const filename = getFilenameFromUrl(image.src, index);
        folder.file(filename, blob);
      } catch (error) {
        console.error(
          `${DOWNLOAD_ERROR_MESSAGES.FAILED_TO_FETCH}: ${image.src}`,
          error
        );
        // Continue with other images even if one fails
      }
    });

    await Promise.all(imagePromises);

    // Generate zip file
    const content = await zip.generateAsync({ type: "blob" });

    // Create download link
    const url = URL.createObjectURL(content);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${DOWNLOAD_CONSTANTS.DEFAULT_FILENAME}-${Date.now()}${DOWNLOAD_CONSTANTS.FILE_EXTENSION}`;

    // Trigger download
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error(DOWNLOAD_ERROR_MESSAGES.FAILED_TO_CREATE_ZIP, error);
    throw error;
  }
};
