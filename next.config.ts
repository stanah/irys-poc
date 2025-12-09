import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        net: false,
        tls: false,
        "pino-pretty": false,
        lokijs: false,
        encoding: false,
      };
    }
    // Fix for pino/thread-stream issues including test runners in build
    config.resolve.alias = {
        ...config.resolve.alias,
        "tap": false,
        "tape": false,
        "why-is-node-running": false,
    }
    return config;
  },
};

export default nextConfig;
