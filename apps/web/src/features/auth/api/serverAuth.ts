import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";
import type { z } from "zod";

import { serverApiRequest } from "@/shared/lib/serverApiClient";

import type { TokenPurpose, UserSession } from "../types";
import {
  type BrandInviteInfo,
  brandInviteInfoSchema,
  sessionResponseSchema,
  toUserSession,
  validateTokenResponseSchema,
} from "./userSchemas";

type ValidateTokenResponse = z.infer<typeof validateTokenResponseSchema>;
type SessionResponse = z.infer<typeof sessionResponseSchema>;

export { getDefaultRouteForUser } from "../utils/getDefaultRoute";

const REFRESH_COOKIE_NAME = "refresh_token";

export type ServerSession = { user: UserSession; accessToken: string };

const fetchServerSession = cache(async (): Promise<SessionResponse | null> => {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;
  if (!refreshToken) return null;

  const cookieHeader = `${REFRESH_COOKIE_NAME}=${refreshToken}`;

  try {
    const raw = await serverApiRequest<SessionResponse>("/auth/session", {
      method: "POST",
      cookie: cookieHeader,
    });
    return sessionResponseSchema.parse(raw);
  } catch {
    return null;
  }
});

export const getServerAccessToken = cache(async (): Promise<string | null> => {
  const session = await fetchServerSession();
  return session?.accessToken ?? null;
});

export const getServerSessionWithToken = cache(async (): Promise<ServerSession | null> => {
  const session = await fetchServerSession();
  if (!session) return null;

  return { user: toUserSession(session.user), accessToken: session.accessToken };
});

export const getServerSession = async (): Promise<UserSession | null> => {
  const session = await getServerSessionWithToken();
  return session?.user ?? null;
};

export const getBrandInviteServer = async (token: string): Promise<BrandInviteInfo | null> => {
  try {
    const raw = await serverApiRequest<BrandInviteInfo>(
      `/auth/invite?token=${encodeURIComponent(token)}`,
    );
    return brandInviteInfoSchema.parse(raw);
  } catch {
    return null;
  }
};

export const isTokenValidServer = async (
  token: string,
  purpose: TokenPurpose,
): Promise<boolean> => {
  try {
    const raw = await serverApiRequest<ValidateTokenResponse>(
      `/auth/validate-token?token=${encodeURIComponent(token)}&purpose=${purpose}`,
    );
    return validateTokenResponseSchema.parse(raw).valid;
  } catch {
    return false;
  }
};
