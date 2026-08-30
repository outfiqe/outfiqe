import { isTenantHost } from "@outfiqe/utils";
import { type NextRequest, NextResponse } from "next/server";

import { UserRole } from "@/features/auth/types";
import { getDefaultRouteForUser } from "@/features/auth/utils/getDefaultRoute";
import { getSafeRedirect, resolveLoginDestination } from "@/features/auth/utils/safeRedirect";

/* 
 Deliberately not going through serverApiClient/serverAuth here — those are
 marked "server-only" for the RSC render graph, and proxy is a separate
 runtime boundary. Kept minimal on purpose: this only decides whether a
 role-gated segment can render at all, before any React tree (or client
 Router Cache entry) for it exists — the page-level requireDashboardSession
 checks stay in place as the real data-fetching/defense-in-depth layer.
 */

const API_URL = process.env.API_URL ?? "http://localhost:4000";
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "/admin";
const TENANT_BASE_DOMAIN = process.env.NEXT_PUBLIC_TENANT_BASE_DOMAIN ?? "localhost";
const REFRESH_COOKIE_NAME = "refresh_token";

type ProxyUser = { role: UserRole };

const fetchSessionUser = async (refreshToken: string): Promise<ProxyUser | null> => {
  try {
    const sessionRes = await fetch(`${API_URL}/api/auth/session`, {
      method: "POST",
      headers: { Cookie: `${REFRESH_COOKIE_NAME}=${refreshToken}` },
      cache: "no-store",
    });
    const sessionJson = await sessionRes.json().catch(() => null);
    if (!sessionRes.ok || !sessionJson?.success) return null;

    const meRes = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${sessionJson.data.accessToken}` },
      cache: "no-store",
    });
    const meJson = await meRes.json().catch(() => null);
    if (!meRes.ok || !meJson?.success) return null;

    return meJson.data as ProxyUser;
  } catch {
    return null;
  }
};

const DASHBOARD_PATHS = new Set([
  "/profile",
  "/share",
  "/earnings",
  "/withdraw",
  "/progress",
  "/badges",
  "/challenges",
  "/settings/chat",
  "/settings/security",
  "/products",
  "/manage-orders",
  "/wallet",
]);

// role gate per dashboard path: who may render it, and where non-holders bounce
const DASHBOARD_ROLE_RULES: Record<
  string,
  { allow: (role: UserRole) => boolean; fallback: string }
> = {};

export const proxy = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;

  if (DASHBOARD_PATHS.has(pathname)) {
    if (!refreshToken) {
      const loginUrl = new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url);
      return NextResponse.redirect(loginUrl);
    }

    const user = await fetchSessionUser(refreshToken);
    if (!user) {
      const loginUrl = new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url);
      return NextResponse.redirect(loginUrl);
    }
    if (user.role === UserRole.ADMIN) {
      return NextResponse.redirect(new URL(ADMIN_URL, request.url));
    }

    const rule = DASHBOARD_ROLE_RULES[pathname];
    if (rule && !rule.allow(user.role)) {
      return NextResponse.redirect(new URL(rule.fallback, request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/login" && refreshToken) {
    const user = await fetchSessionUser(refreshToken);
    if (user) {
      const target = resolveLoginDestination(
        getSafeRedirect(request.nextUrl.searchParams.get("redirect")),
        getDefaultRouteForUser(user),
        isTenantHost(request.nextUrl.hostname, TENANT_BASE_DOMAIN),
      );
      const destination = target.startsWith("http") ? target : new URL(target, request.url);
      return NextResponse.redirect(destination);
    }
  }

  return NextResponse.next();
};

export const config = {
  matcher: [
    "/profile",
    "/share",
    "/earnings",
    "/withdraw",
    "/progress",
    "/badges",
    "/challenges",
    "/settings/chat",
    "/settings/security",
    "/products",
    "/manage-orders",
    "/wallet",
    "/login",
  ],
};
