"use client";

import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { ReactNode } from "react";

/**
 * Convex client instance for the application.
 * 
 * @remarks
 * Configured with the Convex deployment URL from environment variables.
 * This client is shared across all components that use Convex.
 */
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

/**
 * Props for the ConvexProvider component.
 */
interface ConvexProviderProps {
  /** Child components to be wrapped with Convex and authentication context */
  children: ReactNode;
}

/**
 * Convex provider wrapper with Clerk authentication integration.
 * 
 * Provides Convex backend access to all child components with integrated
 * Clerk authentication. This allows Convex mutations and queries to access
 * the authenticated user's identity automatically.
 * 
 * @remarks
 * - Must be nested inside ClerkProvider to access authentication context
 * - Automatically passes Clerk auth tokens to Convex backend
 * - Enables authenticated queries and mutations in Convex functions
 * - Uses Clerk's useAuth hook to manage authentication state
 * - This is a client component and requires "use client" directive
 * 
 * @example
 * ```tsx
 * <ClerkProvider>
 *   <ConvexProvider>
 *     <YourApp />
 *   </ConvexProvider>
 * </ClerkProvider>
 * ```
 * 
 * @param props - Component props
 * @returns Convex provider with Clerk auth wrapping children
 */
export function ConvexProvider({ children }: ConvexProviderProps) {
  return (
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
