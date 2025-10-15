"use client";

import { SignOutButton as SignOut } from "@clerk/nextjs";
import { LogOut } from "lucide-react";

export default function SignOutRoute() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <SignOut redirectUrl="/">
        <button className="flex items-center gap-2 rounded-2xl border border-border/50 bg-card/85 px-4 py-2 text-sm font-medium text-foreground transition hover:border-border/35 hover:bg-card/90">
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </SignOut>
    </div>
  );
}
