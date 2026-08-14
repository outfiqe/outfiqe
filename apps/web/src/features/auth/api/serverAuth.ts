import "server-only";

import { cookies } from "next/headers";
import type { z } from "zod";

import { serverApiRequest } from "@/shared/lib/serverApiClient";

import type { TokenPurpose, UserSession } from "../types";
import {
  type BrandInviteInfo,
  brandInviteInfoSchema,
  currentUserSchema,
  toUserSession,
  validateTokenResponseSchema,
} from "./userSchemas";

type CurrentUser = z.infer<typeof currentUserSchema>;
type ValidateTokenResponse = z.infer<typeof validateTokenResponseSchema>;

export { getDefaultRouteForUser } from "../utils/getDefaultRoute";

const REFRESH_COOKIE_NAME = "refresh_token";

export type ServerSession = { user: UserSession; accessToken: string };

export const getServerSessionWithToken = async (): Promise<ServerSession | null> => {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;
  if (!refreshToken) return null;

  const cookieHeader = `${REFRESH_COOKIE_NAME}=${refreshToken}`;

  try {
    const { accessToken } = await serverApiRequest<{ accessToken: string }>("/auth/session", {
      method: "POST",
      cookie: cookieHeader,
    });
    const rawUser = await serverApiRequest<CurrentUser>("/auth/me", { accessToken });
    return { user: toUserSession(currentUserSchema.parse(rawUser)), accessToken };
  } catch {
    // No valid session — not an error state for the guard, just "signed out".
    return null;
  }
};

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
