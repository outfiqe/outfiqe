import type { NextConfig } from "next";

// Server-only — never exposed to the browser. The API origin the Next
// server proxies to; the browser always calls same-origin `/api/*`, so
// there's no CORS setup and no need for a client-exposed API URL at all.
const apiUrl = process.env.API_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  reactCompiler: true,

  async rewrites() {
    return [{ source: "/api/:path*", destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;
