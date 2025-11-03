import { uploadRemoteAsset } from "@/lib/server/remote-asset-uploader";
import type { GeneratedAssetUploadPayload } from "@/types/generated-asset";
import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const authData = await auth();
    const { userId, getToken } = authData;

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const token = await getToken({ template: "convex" });

    if (!token) {
      return NextResponse.json(
        { error: "Failed to get auth token" },
        { status: 401 },
      );
    }

    const payload = (await req.json()) as GeneratedAssetUploadPayload;

    if (!payload?.sourceUrl || !payload.assetType) {
      return NextResponse.json(
        { error: "sourceUrl and assetType are required" },
        { status: 400 },
      );
    }

    const uploadResult = await uploadRemoteAsset({
      authToken: token,
      origin: req.nextUrl.origin,
      payload,
    });

    return NextResponse.json(uploadResult);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Upload failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
