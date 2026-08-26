import type { NextConfig } from "next";

/*
 Server-only — never exposed to the browser. The API origin the Next
 server proxies to; the browser always calls same-origin `/api/*`, so
 there's no CORS setup and no need for a client-exposed API URL at all.
 */
const apiUrl = process.env.API_URL ?? "http://localhost:4000";

const adminUrl = process.env.ADMIN_ORIGIN_URL ?? "http://localhost:5173";

const isProduction = process.env.NODE_ENV === "production";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["outfiqe.local", "*.outfiqe.local"],

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },

  async rewrites() {
    return [
      /* Keep the /api prefix on the way through — the Express app itself
         mounts routes at /api/auth/* and /api/users/* (see apps/api/src/app.ts),
         it does not strip the prefix. Dropping it here would 404 every call.
      */
      { source: "/api/:path*", destination: `${apiUrl}/api/:path*` },
      { source: "/admin", destination: `${adminUrl}/admin/` },
      { source: "/admin/:path*", destination: `${adminUrl}/admin/:path*` },
    ];
  },
};

export default nextConfig;
