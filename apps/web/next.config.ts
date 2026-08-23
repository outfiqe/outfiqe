import type { NextConfig } from "next";

/* 
 Server-only — never exposed to the browser. The API origin the Next
 server proxies to; the browser always calls same-origin `/api/*`, so
 there's no CORS setup and no need for a client-exposed API URL at all.
 */
const apiUrl = process.env.API_URL ?? "http://localhost:4000";

const adminUrl = process.env.ADMIN_ORIGIN_URL ?? "http://localhost:5173";

const isProduction = process.env.NODE_ENV === "production";

const getSentryConnectSrc = (): string => {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return "";
  try {
    return ` ${new URL(dsn).origin}`;
  } catch {
    return "";
  }
};

const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' ${TURNSTILE_ORIGIN}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${TURNSTILE_ORIGIN}${getSentryConnectSrc()}`,
  `frame-src 'self' ${TURNSTILE_ORIGIN}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  ...(isProduction ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
  ...(isProduction
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  reactCompiler: true,

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
