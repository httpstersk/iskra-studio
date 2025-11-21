import {
  uploadFileToConvex,
  type UploadMetadata,
} from "@/lib/server/upload-service";
import type { GeneratedAssetUploadPayload } from "@/types/generated-asset";
import { Buffer } from "node:buffer";
import sharp from "sharp";
import { trySync, tryPromise, isErr, getErrorMessage } from "@/lib/errors/safe-errors";

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
  // Try to parse as absolute URL
  if (sourceUrl.startsWith("http://") || sourceUrl.startsWith("https://")) {
    const urlResult = trySync(() => new URL(sourceUrl));

    if (isErr(urlResult)) {
      return sourceUrl;
    }

    return unwrapProxyUrl(urlResult) ?? urlResult.toString();
  }

  // Try to parse as relative URL
  const absoluteResult = trySync(() => new URL(sourceUrl, origin));

  if (isErr(absoluteResult)) {
    return sourceUrl;
  }

  return unwrapProxyUrl(absoluteResult) ?? absoluteResult.toString();
}

async function downloadRemoteAsset(
  url: string,
  assetType: GeneratedAssetUploadPayload["assetType"]
): Promise<DownloadedAsset> {
  const fetchResult = await tryPromise(fetch(url));

  if (isErr(fetchResult)) {
    throw new Error(`Failed to fetch asset from ${url}: ${getErrorMessage(fetchResult)}`);
  }

  const response = fetchResult;

  if (!response.ok) {
    throw new Error(
      `Failed to download asset from ${url}: ${response.status} ${response.statusText}`
    );
  }

  const fallbackType = assetType === "image" ? "image/png" : "video/mp4";
  const contentType = response.headers.get("content-type") || fallbackType;

  const arrayBufferResult = await tryPromise(response.arrayBuffer());
  if (isErr(arrayBufferResult)) {
    throw new Error(`Failed to read asset data: ${getErrorMessage(arrayBufferResult)}`);
  }

  return {
    buffer: Buffer.from(arrayBufferResult),
    contentType,
  };
}

async function generateThumbnailBlob(
  buffer: Buffer
): Promise<Blob | undefined> {
  const thumbnailResult = await tryPromise(
    sharp(buffer)
      .resize(400, 400, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 75 })
      .toBuffer()
  );

  if (isErr(thumbnailResult)) {
    return undefined;
  }

  return new Blob([new Uint8Array(thumbnailResult)], { type: "image/webp" });
}
