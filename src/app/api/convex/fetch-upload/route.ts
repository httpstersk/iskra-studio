import { uploadRemoteAsset } from "@/lib/server/remote-asset-uploader";
import type { GeneratedAssetUploadPayload } from "@/types/generated-asset";
import { requireAuth } from "@/lib/api/auth-middleware";
import { createErrorResponse, createSuccessResponse } from "@/lib/api/error-response";
import { NextResponse, type NextRequest } from "next/server";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Authenticate user and get Convex token
    const { convexToken } = await requireAuth();

    const payload = (await req.json()) as GeneratedAssetUploadPayload;

    if (!payload?.sourceUrl || !payload.assetType) {
      return NextResponse.json(
        { error: "sourceUrl and assetType are required" },
        { status: 400 },
      );
    }

    const uploadResult = await uploadRemoteAsset({
      authToken: convexToken,
      origin: req.nextUrl.origin,
      payload,
    });

    return createSuccessResponse(uploadResult);
  } catch (error) {
    return createErrorResponse(error, "Upload failed");
  }
}
