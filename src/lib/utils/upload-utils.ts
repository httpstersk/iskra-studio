import { createStorageService } from "@/lib/storage";
import { showErrorFromException } from "@/lib/toast";
import { tryPromise, isErr, getErrorMessage } from "@/lib/errors/safe-errors";

/**
 * Uploads an image directly to storage from a data URL.
 *
 * @param dataUrl - The data URL of the image to upload
 * @param userId - The ID of the user uploading the image
 * @returns Promise resolving to the uploaded image URL
 */
export const uploadImageDirect = async (
  dataUrl: string,
  userId: string | undefined
) => {
  // Convert data URL to blob first
  const fetchResult = await tryPromise(fetch(dataUrl));

  if (isErr(fetchResult)) {
    const error = new Error(
      `Failed to fetch data URL: ${getErrorMessage(fetchResult)}`
    );
    showErrorFromException("Failed to upload image", error, "Unknown error");
    throw error;
  }

  const blobResult = await tryPromise(fetchResult.blob());

  if (isErr(blobResult)) {
    const error = new Error(
      `Failed to convert to blob: ${getErrorMessage(blobResult)}`
    );
    showErrorFromException("Failed to upload image", error, "Unknown error");
    throw error;
  }

  const blob = blobResult;

  try {
    // Upload to Convex storage
    if (!userId) {
      throw new Error("User ID required for upload");
    }

    const storage = createStorageService();
    const uploadResult = await storage.upload(blob, {
      userId,
      type: "image",
      mimeType: blob.type || "image/png",
      metadata: {},
    });

    return { url: uploadResult.url };
  } catch (error: unknown) {
    showErrorFromException("Failed to upload image", error, "Unknown error");

    // Re-throw the error so calling code knows upload failed
    throw error;
  }
};
