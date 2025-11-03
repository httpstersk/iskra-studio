/**
 * Loading fallback component for Suspense boundaries.
 *
 * Displays a minimal loading state while data is being fetched.
 */

"use client";

export default function LoadingFallback() {
  return (
    <div className="flex items-center justify-center w-full h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-muted rounded-full" />
          <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">
          Loading canvas...
        </p>
      </div>
    </div>
  );
}
