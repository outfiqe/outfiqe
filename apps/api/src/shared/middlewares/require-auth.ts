import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { AppError } from "./error-handler.js";

import { verifyToken } from "#lib/verify-token.utils.js";
import type { AuthPrincipal, JWTPayload } from "#types/token.types.js";

const BEARER_PREFIX = "Bearer ";
const UNAUTHORIZED_STATUS = 401;
const UNAUTHORIZED_MESSAGE = "Authentication required.";

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith(BEARER_PREFIX)) {
    return next(new AppError("UNAUTHORIZED", UNAUTHORIZED_MESSAGE, UNAUTHORIZED_STATUS));
  }

  const token = authHeader.slice(BEARER_PREFIX.length).trim();
  if (!token) {
    return next(new AppError("UNAUTHORIZED", UNAUTHORIZED_MESSAGE, UNAUTHORIZED_STATUS));
  }

  try {
    const payload = verifyToken(token) as JWTPayload;

    if (!payload.sub || !payload.role) {
      return next(new AppError("UNAUTHORIZED", UNAUTHORIZED_MESSAGE, UNAUTHORIZED_STATUS));
    }

    res.locals.auth = { userId: payload.sub, role: payload.role } satisfies AuthPrincipal;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(
        new AppError(
          "TOKEN_EXPIRED",
          "Your session has expired. Please sign in again.",
          UNAUTHORIZED_STATUS,
        ),
      );
    }
    next(new AppError("UNAUTHORIZED", UNAUTHORIZED_MESSAGE, UNAUTHORIZED_STATUS));
  }
};

export const getAuthPrincipal = (res: Response): AuthPrincipal | undefined => res.locals.auth;
