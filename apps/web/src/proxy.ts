import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPublicApiOrigin } from "@/shared/lib/apiOrigin";
import { buildContentSecurityPolicy } from "@/shared/lib/contentSecurityPolicy";

const DYNAMIC_POLICY_PATH_PREFIXES = [
  "/shop",
  "/product",
  "/creator",
  "/brand",
  "/profile",
  "/messages",
  "/settings",
  "/overview",
  "/badges",
  "/challenges",
  "/earnings",
  "/progress",
  "/wallet",
  "/withdraw",
  "/products",
  "/manage-orders",
  "/orders",
  "/dashboard",
  "/login",
  "/register",
  "/reset-password",
  "/forgot-password",
  "/verify-email",
  "/auth",
  "/checkout",
  "/apply",
  "/payments",
  "/support",
  "/share",
  "/r",
  "/internal",
];

const needsDynamicPolicy = (pathname: string): boolean =>
  pathname === "/" ||
  DYNAMIC_POLICY_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

export const proxy = (request: NextRequest) => {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const isProduction = process.env.NODE_ENV === "production";
  const apiOrigin = getPublicApiOrigin();
  const contentSecurityPolicy = buildContentSecurityPolicy({
    nonce,
    isDev,
    isProduction,
    apiOrigin,
    renderMode: needsDynamicPolicy(request.nextUrl.pathname) ? "dynamic" : "static",
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);

  return response;
};

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
