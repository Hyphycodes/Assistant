import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Browser verification and Playwright use 127.0.0.1 while local developers
  // commonly use localhost. Keep the dev resource boundary explicit.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // The bottom-left dev indicator overlaps the product's mobile Home nav item.
  // Compile/runtime error overlays remain enabled when this is false.
  devIndicators: false,
};

export default nextConfig;
