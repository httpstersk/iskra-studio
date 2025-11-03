import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * Matches routes that should be publicly accessible without authentication.
 * Includes the landing page, API routes, static assets, and authentication pages.
 */
const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-in",
  "/sign-up(.*)",
  "/sign-up",
  "/api/webhooks(.*)",
  "/_next(.*)",
  "/favicon.ico",
]);

/**
 * Clerk authentication middleware for Next.js.
 *
 * Protects all routes except those defined in `isPublicRoute`.
 * Passes authentication state to downstream requests via headers.
 *
 * @remarks
 * - Anonymous users are redirected to `/sign-in` when accessing protected routes
 * - Authentication state is available in API routes and pages via `getAuth()`
 * - The middleware runs on all routes matching the `matcher` config below
 *
 * @see {@link https://clerk.com/docs/references/nextjs/clerk-middleware | Clerk Middleware Documentation}
 */
export default clerkMiddleware(async (auth, request) => {
  const isPublic = isPublicRoute(request);

  // Protect all non-public routes
  if (!isPublic) {
    await auth.protect();
  }

  return NextResponse.next();
});

/**
 * Configuration for Next.js middleware.
 *
 * Specifies which routes the middleware should run on.
 * Excludes static files and internal Next.js routes for performance.
 */
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
