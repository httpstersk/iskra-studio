/**
 * Server-side Convex client utilities for SSR data fetching.
 *
 * Provides type-safe server-side access to Convex queries for:
 * - Pre-fetching user data in Server Components
 * - Loading initial project lists
 * - Reducing client-side waterfall requests
 *
 * @remarks
 * This module uses `server-only` to ensure it's never bundled client-side.
 */

import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import "server-only";
import { api } from "../../../convex/_generated/api";

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
 *
 * @returns User record or null if not authenticated
 */
export async function getCurrentUser() {
  try {
    const client = await getAuthenticatedConvexClient();
    const user = await client.query(api.users.getCurrentUser);
    return user;
  } catch (error) {
    return null;
  }
}

/**
 * Server-side: Lists user's projects with optional limit.
 *
 * @param limit - Maximum number of projects to fetch (default: 10)
 * @returns Array of projects or empty array if not available
 */
export async function listProjects(limit = 10) {
  try {
    const client = await getAuthenticatedConvexClient();
    const projects = await client.query(api.projects.listProjects, { limit });
    return projects;
  } catch (error) {
    return [];
  }
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
