import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { Context } from "./context";
import {
  createRateLimiter,
  shouldLimitRequest,
  RateLimiter,
} from "@/lib/ratelimit";
import { TRPCError } from "@trpc/server";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// Create rate limiter for tRPC endpoints
const trpcLimiter: RateLimiter = {
  perMinute: createRateLimiter(5, "60 s"),
  perHour: createRateLimiter(15, "60 m"),
  perDay: createRateLimiter(50, "24 h"),
};

// Rate limiting middleware
const rateLimitMiddleware = t.middleware(async ({ ctx, next }) => {
  const req = ctx.req;
  if (!req) {
    return next();
  }

  // Extract IP from request
  const ip =
    req.headers.get?.("x-forwarded-for") ||
    req.headers.get?.("x-real-ip") ||
    "unknown";

  const limiterResult = await shouldLimitRequest(trpcLimiter, ip);

  if (limiterResult.shouldLimitRequest) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded per ${limiterResult.period}`,
    });
  }

  return next();
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const rateLimitedProcedure = t.procedure.use(rateLimitMiddleware);

export const createCallerFactory = t.createCallerFactory;
