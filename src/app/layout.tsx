import LoadingFallback from "@/components/loading-fallback";
import { geistMono, geistSans } from "@/lib/fonts";
import { generateBaseMetadata } from "@/lib/metadata";
import { BotIdClient } from "botid/client";
import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { CoreProviders } from "./core-providers";
import "./globals.css";

/**
 * Base site metadata generated via `generateBaseMetadata`.
 */
export const metadata: Metadata = generateBaseMetadata();

/**
 * Viewport configuration for consistent scaling across devices.
 */
export const viewport: Viewport = {
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  width: "device-width",
};

/**
 * Root layout for the Next.js App Router.
 * Wraps providers and global UI primitives.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={[geistSans.variable, geistMono.variable].join(" ")}
      suppressHydrationWarning
    >
      <head>
        <meta name="color-scheme" content="dark" />
        {process.env.NODE_ENV === "production" && (
          <BotIdClient
            protect={[
              {
                method: "POST",
                path: "/api/trpc/*",
              },
            ]}
          />
        )}
      </head>

      <body className={`font-sans bg-background text-foreground min-h-screen`}>
        <Suspense fallback={<LoadingFallback />}>
          <CoreProviders>{children}</CoreProviders>
        </Suspense>
      </body>
    </html>
  );
}
