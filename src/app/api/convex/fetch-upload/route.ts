import {
  uploadFileToConvex,
  type UploadMetadata,
} from "@/lib/server/upload-service";
import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { Buffer } from "node:buffer";
import sharp from "sharp";

export const maxDuration = 60;
export const runtime = "nodejs";

interface FetchUploadPayload {
  assetType: "image" | "video";
  metadata?: UploadMetadata;
  sourceUrl: string;
}

function resolveSourceUrl(sourceUrl: string, origin: string): string {
  // If it's already absolute, return as-is
  if (sourceUrl.startsWith("http://") || sourceUrl.startsWith("https://")) {
    // Unwrap proxy URLs to avoid double downloads when possible
    if (sourceUrl.includes("/api/storage/proxy")) {
      try {
        const parsed = new URL(sourceUrl);
        const signedUrl = parsed.searchParams.get("url");
        if (signedUrl) {
          return decodeURIComponent(signedUrl);
        }
      } catch {
        return sourceUrl;
      }
    }
    return sourceUrl;
  }

  // Otherwise resolve relative to current origin
  const absoluteUrl = new URL(sourceUrl, origin);
  if (absoluteUrl.pathname.includes("/api/storage/proxy")) {
    const signedUrl = absoluteUrl.searchParams.get("url");
    if (signedUrl) {
      return decodeURIComponent(signedUrl);
    }
  }
  return absoluteUrl.toString();
}

async function generateThumbnailBlob(buffer: Buffer): Promise<Blob> {
  const thumbnailBuffer = await sharp(buffer)
    .resize(400, 400, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 75 })
    .toBuffer();

  return new Blob([thumbnailBuffer], { type: "image/webp" });
}

export async function POST(req: NextRequest) {
  try {
    const authData = await auth();
    const { userId, getToken } = authData;

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = await getToken({ template: "convex" });

    if (!token) {
      return NextResponse.json(
        { error: "Failed to get auth token" },
        { status: 401 }
      );
    }

    const payload = (await req.json()) as FetchUploadPayload;

    if (!payload?.sourceUrl || !payload.assetType) {
      return NextResponse.json(
        { error: "sourceUrl and assetType are required" },
        { status: 400 }
      );
    }

    const resolvedUrl = resolveSourceUrl(payload.sourceUrl, req.nextUrl.origin);
    const downloadResponse = await fetch(resolvedUrl);

    if (!downloadResponse.ok) {
      return NextResponse.json(
        { error: `Failed to download asset: ${downloadResponse.statusText}` },
        { status: 502 }
      );
    }

    const arrayBuffer = await downloadResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fallbackType =
      payload.assetType === "image" ? "image/png" : "video/mp4";
    const contentType =
      downloadResponse.headers.get("content-type") || fallbackType;

    const fileBlob = new Blob([buffer], { type: contentType });
    let thumbnailBlob: Blob | undefined;

    if (payload.assetType === "image") {
      try {
        thumbnailBlob = await generateThumbnailBlob(buffer);
      } catch (error) {
        console.warn("Thumbnail generation failed:", error);
      }
    }

    const uploadResult = await uploadFileToConvex({
      authToken: token,
      file: fileBlob,
      metadata: payload.metadata,
      thumbnail: thumbnailBlob,
    });

    return NextResponse.json(uploadResult);
  } catch (error) {
    console.error("[Convex Fetch Upload] Error:", error);
    return NextResponse.json(
      {
        error: "Upload failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
