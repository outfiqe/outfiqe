import type { CookieOptions, Request, Response } from "express";

import { env } from "#config/env.config.js";

const REFRESH_TOKEN_COOKIE_NAME = "refresh_token";
const AUTH_COOKIE_PATH = "/";
const MS_PER_SECOND = 1000;

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "strict",
  path: AUTH_COOKIE_PATH,
};

export const setRefreshCookie = (res: Response, token: string, ttlSeconds: number): void => {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, {
    ...baseCookieOptions,
    maxAge: ttlSeconds * MS_PER_SECOND,
  });
};

export const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, baseCookieOptions);
};

export const getRefreshTokenCookie = (req: Request): string | undefined => {
  const value: unknown = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];
  return typeof value === "string" ? value : undefined;
};
