/** @type {import('next').NextConfig} */
import { withBotId } from "botid/next/config";

const nextConfig = {
  api: {
    bodyParser: {
      sizeLimit: "50mb",
    },
  },
  devIndicators: false,
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
  middlewareClientMaxBodySize: 50 * 1024 * 1024,
  webpack: (config) => {
    // Ignore canvas module which is required by Konva in Node environments
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;
  
    return config;
  },
};

export default withBotId(nextConfig);
