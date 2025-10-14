"use client";

import { ClerkProvider as ClerkProviderBase } from "@clerk/nextjs";
import { ReactNode } from "react";

/**
 * Props for the ClerkProvider component.
 */
interface ClerkProviderProps {
  /** Child components to be wrapped with Clerk authentication context */
  children: ReactNode;
}

/**
 * Clerk authentication provider wrapper for the application.
 * 
 * Provides Clerk authentication context to all child components,
 * enabling access to user authentication state and functions throughout the app.
 * 
 * @remarks
 * - Configured with dark theme to match application design
 * - Sign-in and sign-up routes are configured via environment variables
 * - Must be used at the root level to ensure authentication context is available everywhere
 * - This is a client component and requires "use client" directive
 * 
 * @example
 * ```tsx
 * <ClerkProvider>
 *   <YourApp />
 * </ClerkProvider>
 * ```
 * 
 * @param props - Component props
 * @returns Clerk provider wrapping children
 */
export function ClerkProvider({ children }: ClerkProviderProps) {
  return (
    <ClerkProviderBase
      signInUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL}
      signUpUrl={process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL}
    >
      {children}
    </ClerkProviderBase>
  );
}
