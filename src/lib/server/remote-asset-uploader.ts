import {
  uploadFileToConvex,
  type UploadMetadata,
} from "@/lib/server/upload-service";
import type { GeneratedAssetUploadPayload } from "@/types/generated-asset";
import { Buffer } from "node:buffer";
import sharp from "sharp";

const PROXY_PATH = "/api/storage/proxy";

interface RemoteAssetUploadOptions {
  authToken: string;
  origin: string;
  payload: GeneratedAssetUploadPayload;
}

interface DownloadedAsset {
  buffer: Buffer;
  contentType: string;
}

export async function uploadRemoteAsset({
  authToken,
  origin,
  payload,
}: RemoteAssetUploadOptions) {
  const resolvedUrl = resolveSourceUrl(payload.sourceUrl, origin);
  const downloaded = await downloadRemoteAsset(resolvedUrl, payload.assetType);

  const fileBlob = new Blob([new Uint8Array(downloaded.buffer)], {
    type: downloaded.contentType,
  });

  const thumbnailBlob =
    payload.assetType === "image"
      ? await generateThumbnailBlob(downloaded.buffer)
      : undefined;

  return uploadFileToConvex({
    authToken,
    file: fileBlob,
    metadata: payload.metadata as UploadMetadata | undefined,
    thumbnail: thumbnailBlob,
  });
}

function unwrapProxyUrl(maybeProxyUrl: URL): string | null {
  if (!maybeProxyUrl.pathname.includes(PROXY_PATH)) {
    return null;
  }

  const signedUrl = maybeProxyUrl.searchParams.get("url");
  return signedUrl ? decodeURIComponent(signedUrl) : null;
}

export function resolveSourceUrl(sourceUrl: string, origin: string): string {
  try {
    if (sourceUrl.startsWith("http://") || sourceUrl.startsWith("https://")) {
      const asUrl = new URL(sourceUrl);
      return unwrapProxyUrl(asUrl) ?? asUrl.toString();
    }

    const absolute = new URL(sourceUrl, origin);
    return unwrapProxyUrl(absolute) ?? absolute.toString();
  } catch {
    return sourceUrl;
  }
}

async function downloadRemoteAsset(
  url: string,
  assetType: GeneratedAssetUploadPayload["assetType"]
): Promise<DownloadedAsset> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download asset: ${response.statusText}`);
  }

  const fallbackType = assetType === "image" ? "image/png" : "video/mp4";
  const contentType = response.headers.get("content-type") || fallbackType;
  const arrayBuffer = await response.arrayBuffer();

  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
  };
}

async function generateThumbnailBlob(buffer: Buffer): Promise<Blob | undefined> {
  try {
    const thumbnailBuffer = await sharp(buffer)
      .resize(400, 400, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 75 })
      .toBuffer();

    return new Blob([new Uint8Array(thumbnailBuffer)], { type: "image/webp" });
  } catch (error) {
    console.warn("[Remote Asset Upload] Thumbnail generation failed:", error);
    return undefined;
  }
}
