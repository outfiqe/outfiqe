import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const REFRESH_COOKIE_NAME = "refresh_token";

export function proxy(request: NextRequest) {
  const hasRefreshCookie = request.cookies.has(REFRESH_COOKIE_NAME);

  if (!hasRefreshCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
