import type { NextConfig } from "next";
import * as path from "path";

const nextConfig: NextConfig = {
  // Disable experimental features that might cause issues
  experimental: {},
  
  // Webpack configuration to ensure correct module resolution
  webpack: (config) => {
    // Force resolve from current project directory only
    config.resolve.modules = [
      path.resolve(process.cwd(), "node_modules"),
      "node_modules",
    ];
    
    // Ensure aliases resolve correctly
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(process.cwd(), "src"),
    };
    
    return config;
  },
  
  // Turbopack configuration
  turbopack: {
    root: path.resolve(process.cwd()),
    resolveAlias: {
      "@/*": "./src/*",
    },
  },
};

export default nextConfig;
