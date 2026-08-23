import type { NextFunction, Request, Response } from "express";

import { CSRF_TOKEN_COOKIE_NAME, getRefreshTokenCookie } from "#lib/cookie.utils.js";

import { AppError } from "./error-handler.js";

const FORBIDDEN_STATUS = 403;
const CSRF_HEADER_NAME = "x-csrf-token";

export const requireCsrfHeader = (req: Request, _res: Response, next: NextFunction) => {
  if (!getRefreshTokenCookie(req)) return next();

  const cookieToken: unknown = req.cookies?.[CSRF_TOKEN_COOKIE_NAME];
  const headerToken = req.header(CSRF_HEADER_NAME);
  const isMatch = typeof cookieToken === "string" && !!cookieToken && cookieToken === headerToken;

  if (!isMatch) {
    return next(
      new AppError(
        "CSRF_MISMATCH",
        "This request could not be verified. Please retry.",
        FORBIDDEN_STATUS,
      ),
    );
  }

  next();
};
