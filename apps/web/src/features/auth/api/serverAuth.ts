import "server-only";
import { cookies } from "next/headers";

import { serverApiRequest } from "@/shared/lib/serverApiClient";
import {
  brandInviteInfoSchema,
  currentUserSchema,
  toUserSession,
  validateTokenResponseSchema,
  type BrandInviteInfo,
} from "./userSchemas";
import type { TokenPurpose, UserSession } from "../types";

export { getDefaultRouteForUser } from "../utils/getDefaultRoute";

// Must match apps/api's shared/utils/cookie.utils.ts (REFRESH_TOKEN_COOKIE_NAME).
const REFRESH_COOKIE_NAME = "refresh_token";

// Used by the signed-out-only route guards (/login, /register) to redirect
// an already-authenticated visitor before the page ever renders — the
// Next-idiomatic replacement for the doc's TanStack `beforeLoad` guard.
// Mirrors AuthContext's boot-time silent refresh, but as one server-side
// round trip: a Server Component render has no in-memory access token to
// reuse across requests, so refresh + /me both run fresh every time this
// is called.
export async function getServerSession(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;
  if (!refreshToken) return null;

  const cookieHeader = `${REFRESH_COOKIE_NAME}=${refreshToken}`;

  try {
    const { accessToken } = await serverApiRequest<{ accessToken: string }>("/auth/refresh", {
      method: "POST",
      cookie: cookieHeader,
    });

    const rawUser = await serverApiRequest<unknown>("/auth/me", { accessToken });
    return toUserSession(currentUserSchema.parse(rawUser));
  } catch {
    // No valid session — not an error state for the guard, just "signed out".
    return null;
  }
}

// Used by /register/brand's page.tsx to validate the invite token and fetch
// the locked email *before* the form mounts (see the auth prompt: "never
// let the component mount" on a bad token). Returns null on any failure —
// the page maps that to a redirect, it doesn't need to distinguish
// INVALID_INVITE from INVITE_EXPIRED from INVITE_USED for that purpose.
export async function getBrandInviteServer(token: string): Promise<BrandInviteInfo | null> {
  try {
    const raw = await serverApiRequest<unknown>(`/auth/invite?token=${encodeURIComponent(token)}`);
    return brandInviteInfoSchema.parse(raw);
  } catch {
    return null;
  }
}

// Used by /reset-password's page.tsx: validates the token server-side
// before the form ever mounts (see the auth prompt — a bad token should
// redirect to /forgot-password?expired=1, not let the user fill the form
// out first and discover it on submit).
export async function isTokenValidServer(token: string, purpose: TokenPurpose): Promise<boolean> {
  try {
    const raw = await serverApiRequest<unknown>(
      `/auth/validate-token?token=${encodeURIComponent(token)}&purpose=${purpose}`,
    );
    return validateTokenResponseSchema.parse(raw).valid;
  } catch {
    return false;
  }
}
