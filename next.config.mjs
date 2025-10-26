/** @type {import('next').NextConfig} */
import { withBotId } from "botid/next/config";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  devIndicators: false,
  experimental: {
    reactCompiler: true,
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

export default withBotId(nextConfig);
