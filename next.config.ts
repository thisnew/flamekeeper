import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Run with `npm run dev` which passes `-H 0.0.0.0` to allow LAN access.
  // If WebSocket HMR fails (browser-side only), the app still works;
  // only live-reload during development is affected.
};

export default nextConfig;