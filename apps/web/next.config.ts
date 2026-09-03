import type { NextConfig } from "next";

/*
 Server-only — never exposed to the browser. The API origin the Next
 server proxies to; the browser always calls same-origin `/api/*`, so
 there's no CORS setup and no need for a client-exposed API URL at all.
 */
const apiUrl = process.env.API_URL ?? "http://localhost:4000";

const adminUrl = process.env.ADMIN_ORIGIN_URL ?? "http://localhost:5173";

const isProdEnv = process.env.NEXT_PUBLIC_APP_ENV === "prod";

const isSearchIndexable = process.env.SEO_INDEXABLE === "true";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  ...(isProdEnv
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }]
    : []),
  ...(isSearchIndexable ? [] : [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]),
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
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
