import { route } from "@fal-ai/server-proxy/nextjs";
import { NextRequest } from "next/server";

import { auth } from "@clerk/nextjs/server";
import { checkBotId } from "botid/server";

import {
  checkRateLimit,
  standardRateLimiter,
  buildRateLimitHeaders,
} from "@/lib/fal/utils";

export const POST = async (req: NextRequest) => {
  // Check for bot activity first
  const verification = await checkBotId();
  if (verification.isBot) {
    return new Response("Access denied", { status: 403 });
  }

  const authHeader = req.headers.get("authorization");

  if (authHeader) {
    return new Response("Custom FAL API keys are not accepted.", {
      status: 400,
    });
  }

  // Get userId from Clerk for per-user rate limiting
  const { userId } = await auth();

  // Always apply rate limiting (per-user if authenticated, per-IP otherwise)
  const rateLimitResult = await checkRateLimit({
    limiter: standardRateLimiter,
    headers: req.headers,
    userId: userId ?? undefined,
    limitType: "standard",
  });

  if (rateLimitResult.shouldLimitRequest) {
    const headers = buildRateLimitHeaders(rateLimitResult.period, {
      perMinute: "10",
      perHour: "30",
      perDay: "100",
    });

    return new Response(
      `Rate limit exceeded per ${rateLimitResult.period}. Please try again later.`,
      {
        status: 429,
        headers,
      }
    );
  }

  return route.POST(req);
};

export const { GET, PUT } = route;
