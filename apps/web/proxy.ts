import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPublicApiOrigin } from "@/shared/lib/apiOrigin";
import { buildContentSecurityPolicy } from "@/shared/lib/contentSecurityPolicy";

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
