/**
 * Authentication middleware for API routes
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export interface AuthContext {
  userId: string;
  convexToken: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Require authentication and return user context
 * Throws AuthError if authentication fails
 */
export async function requireAuth(): Promise<AuthContext> {
  const authData = await auth();
  const { userId, getToken } = authData;

  if (!userId) {
    throw new AuthError("Authentication required", 401);
  }

  const convexToken = await getToken({ template: "convex" });
  if (!convexToken) {
    throw new AuthError("Failed to get auth token", 401);
  }

  return {
    userId,
    convexToken,
  };
}

/**
 * Get user ID only (lighter weight than full auth context)
 */
export async function requireUserId(): Promise<string> {
  const { userId } = await auth();

  if (!userId) {
    throw new AuthError("Authentication required", 401);
  }

  return userId;
}

/**
 * Get Convex token for authenticated requests
 */
export async function getConvexToken(): Promise<string> {
  const authData = await auth();
  const { userId, getToken } = authData;

  if (!userId) {
    throw new AuthError("Authentication required", 401);
  }

  const token = await getToken({ template: "convex" });
  if (!token) {
    throw new AuthError("Failed to get auth token", 401);
  }

  return token;
}

/**
 * Handle authentication errors and return appropriate response
 */
export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode },
    );
  }

  // Re-throw if not an auth error
  throw error;
}

/**
 * Optional authentication - returns null if not authenticated
 */
export async function optionalAuth(): Promise<AuthContext | null> {
  try {
    return await requireAuth();
  } catch (error) {
    if (error instanceof AuthError) {
      return null;
    }
    throw error;
  }
}
