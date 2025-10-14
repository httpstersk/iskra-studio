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
import { storageQuotaAtom } from "@/store/auth-atoms";
import { useAtomValue } from "jotai";
import { Crown, Database, LogOut, Settings, User } from "lucide-react";

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
 * Provides a dropdown menu with user details, storage quota indicator,
 * tier badge, account management link, and sign-out functionality.
 * Uses Clerk's UserButton for avatar display.
 * 
 * @remarks
 * - Displays user email and avatar
 * - Shows tier badge (Free or Paid)
 * - Displays storage quota with visual indicator
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
  const storageQuota = useAtomValue(storageQuotaAtom);

  if (!isAuthenticated || !convexUser) {
    return null;
  }

  /**
   * Formats bytes to human-readable storage size.
   * 
   * @param bytes - Number of bytes
   * @returns Formatted string (e.g., "45.2 MB")
   */
  const formatStorageSize = (bytes: number): string => {
    if (bytes === 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    const gb = bytes / (1024 * 1024 * 1024);
    
    if (gb >= 1) {
      return `${gb.toFixed(2)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  /**
   * Gets the color class for storage quota indicator.
   * 
   * @returns Tailwind color class based on usage percentage
   */
  const getQuotaColor = (): string => {
    if (!storageQuota) return "text-muted-foreground";
    if (storageQuota.percentage >= 90) return "text-destructive";
    if (storageQuota.percentage >= 80) return "text-warning";
    return "text-muted-foreground";
  };

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
        
        {storageQuota && (
          <>
            <DropdownMenuItem
              aria-label="Storage usage information"
              className="flex flex-col items-start gap-1 cursor-default focus:bg-transparent"
            >
              <div className="flex items-center gap-2 w-full">
                <Database className="w-4 h-4" />
                <span className="text-xs font-medium">Storage</span>
              </div>
              <div className="w-full pl-6">
                <div className="flex justify-between text-xs mb-1">
                  <span className={getQuotaColor()}>
                    {formatStorageSize(storageQuota.used)}
                  </span>
                  <span className="text-muted-foreground">
                    {formatStorageSize(storageQuota.limit)}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    aria-label={`${storageQuota.percentage}% storage used`}
                    className={`h-full transition-all ${
                      storageQuota.percentage >= 90
                        ? "bg-destructive"
                        : storageQuota.percentage >= 80
                          ? "bg-warning"
                          : "bg-primary"
                    }`}
                    role="progressbar"
                    style={{ width: `${Math.min(storageQuota.percentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {storageQuota.percentage.toFixed(0)}% used
                </p>
              </div>
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
          </>
        )}
        
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
