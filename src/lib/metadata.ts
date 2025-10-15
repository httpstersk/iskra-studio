/**
 * Dynamic metadata generation utilities for Next.js
 *
 * Provides helper functions for generating SEO-optimized metadata
 * based on application state and user data.
 */

import type { Metadata } from "next";

const APP_NAME = "Iskra ✸ Studio";
const APP_DESCRIPTION = "AI-powered canvas for image and video creation";
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Generates base metadata for the application
 */
export function generateBaseMetadata(): Metadata {
  return {
    title: {
      default: APP_NAME,
      template: `%s | ${APP_NAME}`,
    },
    description: APP_DESCRIPTION,
    applicationName: APP_NAME,
    keywords: [
      "AI image generation",
      "AI video generation",
      "canvas editor",
      "creative tools",
      "generative AI",
    ],
    authors: [{ name: "Iskra" }],
    creator: "Iskra",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(BASE_URL),
    openGraph: {
      type: "website",
      locale: "en_US",
      url: "/",
      title: APP_NAME,
      description: APP_DESCRIPTION,
      siteName: APP_NAME,
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: APP_NAME,
          type: "image/png",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: APP_NAME,
      description: APP_DESCRIPTION,
      images: ["/og-image.png"],
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
}

/**
 * Generates metadata for project pages (if needed in the future)
 */
export function generateProjectMetadata(projectName: string): Metadata {
  return {
    title: projectName,
    description: `Edit ${projectName} in ${APP_NAME}`,
    openGraph: {
      title: `${projectName} | ${APP_NAME}`,
      description: `Edit ${projectName} in ${APP_NAME}`,
    },
  };
}
