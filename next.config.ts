import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure webpack to resolve from the correct directory
  webpack: (config, { isServer }) => {
    // Ensure we resolve from the project root
    config.resolve = {
      ...config.resolve,
      modules: ["node_modules"],
      alias: {
        ...config.resolve?.alias,
        "@": __dirname + "/src",
      },
    };
    return config;
  },
  
  // Turbopack config
  turbopack: {
    // Resolve aliases
    resolveAlias: {
      "@/*": __dirname + "/src/*",
    },
  },
};

export default nextConfig;
