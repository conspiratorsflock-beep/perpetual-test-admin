import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence Turbopack workspace root warning
  turbopack: {
    root: "/Users/bryanjadrich/DEV/Admin Console",
  },
};

export default nextConfig;
