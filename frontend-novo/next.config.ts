import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  // This is needed for Docker deployment
  experimental: {
    // Disable image optimization for Docker
    // You can enable it if you configure a CDN
  },
  images: {
    unoptimized: true,
  },
  // Ignore ESLint errors during production build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignore TypeScript errors during production build
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
