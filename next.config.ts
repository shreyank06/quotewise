import type { NextConfig } from "next";

// Cache Components is left off on purpose: every page here is per-tenant and session-bound,
// so nothing should be cached across requests (and a cross-tenant cache bug is the worst kind).
const nextConfig: NextConfig = {
  serverExternalPackages: ["postgres"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
