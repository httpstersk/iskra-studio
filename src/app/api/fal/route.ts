import { route } from "@fal-ai/server-proxy/nextjs";
import { NextRequest } from "next/server";

import { checkBotId } from "botid/server";

import {
  checkRateLimit,
  extractBearerToken,
  standardRateLimiter,
  buildRateLimitHeaders,
} from "@/lib/fal/utils";

export const POST = async (req: NextRequest) => {
  // Check for bot activity first
  const verification = await checkBotId();
  if (verification.isBot) {
    return new Response("Access denied", { status: 403 });
  }

  // Check if user has provided their own API key
  const authHeader = req.headers.get("authorization");
  const bearerToken = extractBearerToken(authHeader);
  if (authHeader && !bearerToken) {
    return new Response("Invalid authorization header", { status: 400 });
  }
  const customApiKeyPresent = Boolean(bearerToken);

  // Only apply rate limiting if no custom API key is provided
  const rateLimitResult = await checkRateLimit({
    limiter: standardRateLimiter,
    headers: req.headers,
    hasCustomApiKey: customApiKeyPresent,
  });

  if (rateLimitResult.shouldLimitRequest) {
    const headers = buildRateLimitHeaders(rateLimitResult.period, {
      perMinute: "10",
      perHour: "30",
      perDay: "100",
    });
    return new Response(
      `Rate limit exceeded per ${rateLimitResult.period}. Add your FAL API key to bypass rate limits.`,
      {
        status: 429,
        headers,
      },
    );
  }

  return route.POST(req);
};

export const { GET, PUT } = route;
