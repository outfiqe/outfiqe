import type { CookieOptions, Request, Response } from "express";

import { env } from "#config/env.config.js";

const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";
// Non-httpOnly companion to refresh_token: carries no secret, just lets client
// JS know a session might exist without being able to read the real token.
// Lets the web app skip a doomed-to-401 refresh call when it's definitely
// logged out, instead of always asking the server first.
const HAS_SESSION_COOKIE_NAME = "has_session";
const AUTH_COOKIE_PATH = "/";
const MS_PER_SECOND = 1000;

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  path: AUTH_COOKIE_PATH,
};

const hasSessionCookieOptions: CookieOptions = { ...baseCookieOptions, httpOnly: false };

export const setRefreshCookie = (res: Response, token: string, ttlSeconds: number): void => {
  const maxAge = ttlSeconds * MS_PER_SECOND;
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, { ...baseCookieOptions, maxAge });
  res.cookie(HAS_SESSION_COOKIE_NAME, "1", { ...hasSessionCookieOptions, maxAge });
};

export const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, baseCookieOptions);
  res.clearCookie(HAS_SESSION_COOKIE_NAME, hasSessionCookieOptions);
};

export const getRefreshTokenCookie = (req: Request): string | undefined => {
  const value: unknown = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
  return typeof value === "string" ? value : undefined;
};
