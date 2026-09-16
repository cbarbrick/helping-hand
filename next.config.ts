import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // /demo is the standalone kiosk-app demo in public/demo (sample records, no database).
  async rewrites() {
    return [{ source: "/demo", destination: "/demo/index.html" }];
  },
};

export default nextConfig;
