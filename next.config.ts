import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  experimental: {
    // Allow large request bodies for .txt repo imports
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
