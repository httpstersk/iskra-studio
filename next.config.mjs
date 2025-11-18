/** @type {import('next').NextConfig} */
import { withBotId } from "botid/next/config";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Security headers configuration
const securityHeaders = [
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' data: blob: https://*.convex.cloud https://*.convex.site https://*.clerk.accounts.dev https://*.clerk.com https://fal.ai https://*.fal.media https://api.openai.com https://platform.bria.ai https://*.upstash.io wss://*.convex.cloud",
      "media-src 'self' https: blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ]
      .join("; ")
      .replace(/\s{2,}/g, " "),
  },
];

const nextConfig = {
  devIndicators: false,
  experimental: {
    reactCompiler: true,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    domains: ["fal.ai", "storage.googleapis.com"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fal.media",
      },
      {
        protocol: "https",
        hostname: "v3.fal.media",
      },
    ],
  },
  webpack: (config) => {
    // Ignore canvas module which is required by Konva in Node environments
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    // Ensure single Jotai instance to prevent multiple instance warnings
    config.resolve.alias["jotai"] = path.resolve(
      __dirname,
      "node_modules/jotai"
    );

    // Ensure single Konva instance to prevent multiple instance warnings
    config.resolve.alias["konva"] = path.resolve(
      __dirname,
      "node_modules/konva"
    );

    config.resolve.alias["react-konva"] = path.resolve(
      __dirname,
      "node_modules/react-konva"
    );

    // Suppress large string serialization warnings (expected for AI prompts)
    config.infrastructureLogging = {
      ...config.infrastructureLogging,
      level: "error",
    };

    return config;
  },
};

const isProd = process.env.NODE_ENV === "production";
export default isProd ? withBotId(nextConfig) : nextConfig;
