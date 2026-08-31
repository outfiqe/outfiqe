import type { CookieOptions, Request, Response } from "express";

import { IS_DEPLOYED } from "#config/app-env.js";
import { env } from "#config/env.config.js";
import { generateOpaqueToken } from "#lib/opaque-token.utils.js";

const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";
const HAS_SESSION_COOKIE_NAME = "has_session";
export const CSRF_TOKEN_COOKIE_NAME = "csrf_token";
const AUTH_COOKIE_PATH = "/";
const MS_PER_SECOND = 1000;

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: IS_DEPLOYED,
  sameSite: "strict",
  path: AUTH_COOKIE_PATH,
  domain: env.TENANT_BASE_DOMAIN,
};

const hasSessionCookieOptions: CookieOptions = { ...baseCookieOptions, httpOnly: false };
const csrfTokenCookieOptions: CookieOptions = { ...baseCookieOptions, httpOnly: false };

export const setRefreshCookie = (res: Response, token: string, ttlSeconds: number): void => {
  const maxAge = ttlSeconds * MS_PER_SECOND;
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, { ...baseCookieOptions, maxAge });
  res.cookie(HAS_SESSION_COOKIE_NAME, "1", { ...hasSessionCookieOptions, maxAge });
  res.cookie(CSRF_TOKEN_COOKIE_NAME, generateOpaqueToken(), { ...csrfTokenCookieOptions, maxAge });
};

export const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, baseCookieOptions);
  res.clearCookie(HAS_SESSION_COOKIE_NAME, hasSessionCookieOptions);
  res.clearCookie(CSRF_TOKEN_COOKIE_NAME, csrfTokenCookieOptions);
};

export const getRefreshTokenCookie = (req: Request): string | undefined => {
  const value: unknown = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
  return typeof value === "string" ? value : undefined;
};
