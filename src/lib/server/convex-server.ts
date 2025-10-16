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

import "server-only";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { auth } from "@clerk/nextjs/server";

/**
 * Creates a server-side Convex client with authentication.
 * 
 * @returns Authenticated Convex client for server-side queries
 */
async function getAuthenticatedConvexClient() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("NEXT_PUBLIC_CONVEX_URL is not defined");
  }

  const client = new ConvexHttpClient(convexUrl);
  
  const { getToken } = await auth();
  const token = await getToken({ template: "convex" });
  
  if (token) {
    client.setAuth(token);
  }
  
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
    console.error("[Server] Error fetching user:", error);
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
    console.error("[Server] Error fetching projects:", error);
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
      user: null,
      projects: [],
      isAuthenticated: false,
    };
  }

  const [user, projects] = await Promise.all([
    getCurrentUser(),
    listProjects(10),
  ]);

  return {
    user,
    projects,
    isAuthenticated: true,
  };
}
