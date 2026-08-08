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

const REFRESH_COOKIE_NAME = "refresh_token";

export const getServerSession = async (): Promise<UserSession | null> => {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;
  if (!refreshToken) return null;

  const cookieHeader = `${REFRESH_COOKIE_NAME}=${refreshToken}`;

  try {
    const { accessToken } = await serverApiRequest<{ accessToken: string }>("/auth/refresh", {
      method: "POST",
      cookie: cookieHeader,
    });
    //TODO: ADD real Types for Api Data
    const rawUser = await serverApiRequest<unknown>("/auth/me", { accessToken });
    return toUserSession(currentUserSchema.parse(rawUser));
  } catch {
    // No valid session — not an error state for the guard, just "signed out".
    return null;
  }
};

export const getBrandInviteServer = async (token: string): Promise<BrandInviteInfo | null> => {
  try {
    const raw = await serverApiRequest<unknown>(`/auth/invite?token=${encodeURIComponent(token)}`);
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
    const raw = await serverApiRequest<unknown>(
      `/auth/validate-token?token=${encodeURIComponent(token)}&purpose=${purpose}`,
    );
    return validateTokenResponseSchema.parse(raw).valid;
  } catch {
    return false;
  }
};
