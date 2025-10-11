import { commitMono, focal, hal, halMono, inconsolata } from "@/lib/fonts";
import { Analytics } from "@vercel/analytics/next";
import { BotIdClient } from "botid/client";
import type { Metadata } from "next";
import { CoreProviders } from "./core-providers";
import "./globals.css";

const TITLE = "Iskra ✸ Spark";
const DESCRIPTION = "";

export const metadata: Metadata = {
  title: {
    default: TITLE,
    template: "%s",
  },
  description: DESCRIPTION,
  keywords: [],
  authors: [{ name: "" }],
  creator: "",
  publisher: "",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL!),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: TITLE,
    description: DESCRIPTION,
    siteName: TITLE,
    images: [
      {
        url: "/",
        width: 1200,
        height: 630,
        alt: "",
        type: "image/png",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={[
        hal.variable,
        halMono.variable,
        focal.variable,
        inconsolata.variable,
        commitMono.variable,
      ].join(" ")}
      suppressHydrationWarning
    >
      <head>
        <meta name="color-scheme" content="dark" />
        <BotIdClient
          protect={[
            {
              path: "/api/trpc/*",
              method: "POST",
            },
            {
              path: "/api/fal",
              method: "POST",
            },
          ]}
        />
      </head>

      <body className={`font-sans bg-background text-foreground min-h-screen`}>
        <CoreProviders>{children}</CoreProviders>
      </body>
      <Analytics />
    </html>
  );
}
