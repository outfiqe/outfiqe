import { withSerwist } from "@serwist/turbopack";
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

const CLIENT_ROUTER_DYNAMIC_STALE_SECONDS = 30;
const CLIENT_ROUTER_STATIC_STALE_SECONDS = 180;

const imageRemotePatterns = (): NonNullable<NextConfig["images"]>["remotePatterns"] => {
  const sources = [
    apiUrl,
    process.env.API_PUBLIC_URL,
    process.env.NEXT_PUBLIC_SOCKET_URL,
    ...(process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? "").split(","),
  ];

  const patterns = new Map<
    string,
    { protocol: "http" | "https"; hostname: string; port?: string }
  >();

  for (const source of sources) {
    const trimmed = source?.trim();
    if (!trimmed) continue;
    try {
      const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
      const protocol = url.protocol === "http:" ? "http" : "https";
      patterns.set(`${protocol}//${url.host}`, {
        protocol,
        hostname: url.hostname,
        ...(url.port ? { port: url.port } : {}),
      });
    } catch {
      continue;
    }
  }

  return [...patterns.values()];
};

const nextConfig: NextConfig = {
  reactCompiler: true,
  poweredByHeader: false,
  allowedDevOrigins: ["outfiqe.local", "*.outfiqe.local"],

  experimental: {
    staleTimes: {
      dynamic: CLIENT_ROUTER_DYNAMIC_STALE_SECONDS,
      static: CLIENT_ROUTER_STATIC_STALE_SECONDS,
    },
  },

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: imageRemotePatterns(),
  },

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

export default withSerwist(nextConfig);
