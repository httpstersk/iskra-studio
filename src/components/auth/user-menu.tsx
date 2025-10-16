"use client";

import { UserButton } from "@clerk/nextjs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";


import { Crown, LogOut, Settings, User } from "lucide-react";

/**
 * Props for the UserMenu component.
 */
interface UserMenuProps {
  /** Optional CSS class name for styling */
  className?: string;
}

/**
 * User menu component displaying user information and actions.
 * 
 * Provides a dropdown menu with user details, tier badge, account 
 * management link, and sign-out functionality.
 * Uses Clerk's UserButton for avatar display.
 * 
 * @remarks
 * - Displays user email and avatar
 * - Shows tier badge (Free or Paid)
 * - Links to Clerk user profile for account management
 * - Provides sign-out functionality
 * - Accessible with proper ARIA labels
 * - Only visible when user is authenticated
 * 
 * @example
 * ```tsx
 * // Basic usage
 * <UserMenu />
 * 
 * // With custom styling
 * <UserMenu className="my-custom-class" />
 * ```
 * 
 * @param props - Component props
 * @returns User menu component or null if not authenticated
 */
export function UserMenu({ className }: UserMenuProps) {
  const { convexUser, isAuthenticated, signOut, tier } = useAuth();

  if (!isAuthenticated || !convexUser) {
    return null;
  }



  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Open user menu"
          className={className}
          size="icon"
          variant="ghost"
        >
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "w-8 h-8",
              },
            }}
          />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {convexUser.email}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                className="capitalize"
                variant={tier === "paid" ? "default" : "secondary"}
              >
                {tier === "paid" && <Crown className="w-3 h-3 mr-1" />}
                {tier}
              </Badge>
            </div>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem asChild>
          <a
            aria-label="Manage your account"
            className="cursor-pointer"
            href="/user"
          >
            <User className="w-4 h-4 mr-2" />
            Manage Account
          </a>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <a
            aria-label="Open settings"
            className="cursor-pointer"
            href="/settings"
          >
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </a>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          aria-label="Sign out of your account"
          className="cursor-pointer text-destructive focus:text-destructive"
          onClick={signOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
