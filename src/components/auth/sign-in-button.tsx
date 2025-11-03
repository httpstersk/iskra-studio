"use client";

import { SignInButton as ClerkSignInButton } from "@clerk/nextjs";
import { LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Props for the SignInButton component.
 */
interface SignInButtonProps {
  /** Optional CSS class name for styling */
  className?: string;

  /** Button size variant */
  size?: "default" | "sm" | "lg" | "xl" | "xs" | "icon" | "icon-sm" | "icon-xs";

  /** Button style variant */
  variant?: "default" | "primary" | "secondary" | "ghost" | "link";
}

/**
 * Sign-in button component using Clerk authentication.
 *
 * Displays a styled button that initiates the Clerk sign-in flow when clicked.
 * The button is integrated with the application's design system and includes
 * proper accessibility attributes.
 *
 * @remarks
 * - Uses Clerk's SignInButton component internally
 * - Styled with application's Button component
 * - Includes LogIn icon for visual clarity
 * - Accessible with proper ARIA labels
 * - Redirects to configured sign-in page (NEXT_PUBLIC_CLERK_SIGN_IN_URL)
 *
 * @example
 * ```tsx
 * // Basic usage
 * <SignInButton />
 *
 * // With custom styling
 * <SignInButton variant="primary" size="lg" />
 *
 * // With custom class
 * <SignInButton className="my-custom-class" />
 * ```
 *
 * @param props - Component props
 * @returns Sign-in button component
 */
export function SignInButton({
  className,
  size = "default",
  variant = "primary",
}: SignInButtonProps) {
  return (
    <ClerkSignInButton mode="modal">
      <Button
        aria-label="Sign in to your account"
        className={className}
        size={size}
        variant={variant}
      >
        <LogIn />
        Sign In
      </Button>
    </ClerkSignInButton>
  );
}
