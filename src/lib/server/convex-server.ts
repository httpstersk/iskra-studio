/**
 * Server-side Convex client utilities for SSR data fetching.
 *
 * Provides type-safe server-side access to Convex queries for:
 * - Pre-fetching user data in Server Components
 * - Loading initial project lists
 * - Reducing client-side waterfall requests
 * Uses errors-as-values pattern with @safe-std/error
 *
 * @remarks
 * This module uses `server-only` to ensure it's never bundled client-side.
 */

import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import "server-only";
import { api } from "../../../convex/_generated/api";
import { tryPromise, isErr } from "@/lib/errors/safe-errors";

/**
 * Gets the Convex deployment URL.
 *
 * @returns Convex URL
 * @throws Error if NEXT_PUBLIC_CONVEX_URL is not configured
 */
function getConvexUrl(): string {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not defined");
  }
  return convexUrl;
}

/**
 * Gets the Convex site URL for HTTP actions.
 *
 * Converts .convex.cloud to .convex.site for HTTP endpoint access.
 *
 * @returns Convex site URL
 */
export function getConvexSiteUrl(): string {
  const convexUrl = getConvexUrl();
  return convexUrl.replace(".convex.cloud", ".convex.site");
}

/**
 * Creates a server-side Convex client with authentication.
 *
 * @returns Authenticated Convex client for server-side queries
 */
async function getAuthenticatedConvexClient() {
  const convexUrl = getConvexUrl();
  const client = new ConvexHttpClient(convexUrl);

  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });

  if (token) {
    client.setAuth(token);
  }

  return client;
}

/**
 * Creates a Convex client with explicit auth token.
 *
 * Used when auth token is already available (e.g., from API routes).
 *
 * @param token - Convex auth token
 * @returns Authenticated Convex client
 */
export function createConvexClientWithToken(token: string): ConvexHttpClient {
  const convexUrl = getConvexUrl();
  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(token);
  return client;
}

/**
 * Server-side: Gets current user data from Convex.
 * Uses errors-as-values pattern for silent failures.
 *
 * @returns User record or null if not authenticated or on error
 */
export async function getCurrentUser() {
  const clientResult = await tryPromise(getAuthenticatedConvexClient());

  if (isErr(clientResult)) {
    return null;
  }

  const client = clientResult;
  const userResult = await tryPromise(client.query(api.users.getCurrentUser));

  if (isErr(userResult)) {
    return null;
  }

  return userResult;
}

/**
 * Server-side: Lists user's projects with optional limit.
 * Uses errors-as-values pattern for silent failures.
 *
 * @param limit - Maximum number of projects to fetch (default: 10)
 * @returns Array of projects or empty array if not available
 */
export async function listProjects(limit = 10) {
  const clientResult = await tryPromise(getAuthenticatedConvexClient());

  if (isErr(clientResult)) {
    return [];
  }

  const client = clientResult;
  const projectsResult = await tryPromise(
    client.query(api.projects.listProjects, { limit })
  );

  if (isErr(projectsResult)) {
    return [];
  }

  return projectsResult;
}

/**
 * Server-side: Pre-fetches initial application data.
 *
 * Fetches user and recent projects in parallel for optimal SSR.
 *
 * @returns Object containing all initial data or defaults
 */
export async function preloadAppData() {
  const { userId } = await auth();

  if (!userId) {
    return {
      isAuthenticated: false,
      projects: [],
      user: null,
    };
  }

  const [user, projects] = await Promise.all([
    getCurrentUser(),
    listProjects(10),
  ]);

  return {
    isAuthenticated: true,
    projects,
    user,
  };
}
