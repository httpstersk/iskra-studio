import { requireAuth } from "@/lib/api/auth-middleware";
import {
  createErrorResponse,
  createSuccessResponse,
} from "@/lib/api/error-response";
import { isErr, tryPromise } from "@/lib/errors/safe-errors";
import { uploadRemoteAsset } from "@/lib/server/remote-asset-uploader";
import type { GeneratedAssetUploadPayload } from "@/types/generated-asset";
import { NextResponse, type NextRequest } from "next/server";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // Authenticate user and get Convex token
  const authResult = await tryPromise(requireAuth());

  if (isErr(authResult)) {
    return createErrorResponse(authResult, "Authentication failed");
  }

  const { convexToken } = authResult;

  const payloadResult = await tryPromise(req.json());

  if (isErr(payloadResult)) {
    return createErrorResponse(payloadResult, "Invalid JSON body");
  }

  const payload = payloadResult as GeneratedAssetUploadPayload;

  if (!payload?.sourceUrl || !payload.assetType) {
    return NextResponse.json(
      { error: "sourceUrl and assetType are required" },
      { status: 400 },
    );
  }

  const uploadResult = await tryPromise(
    uploadRemoteAsset({
      authToken: convexToken,
      origin: req.nextUrl.origin,
      payload,
    }),
  );

  if (isErr(uploadResult)) {
    return createErrorResponse(uploadResult, "Upload failed");
  }

  return createSuccessResponse(uploadResult);
}
