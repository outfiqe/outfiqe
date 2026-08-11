import type { NextFunction, Request, Response } from "express";

import { isJWTPayload, verifyToken } from "#lib/verify-token.utils.js";
import type { AuthPrincipal } from "#types/token.types.js";

const BEARER_PREFIX = "Bearer ";

// Same shape as requireAuth, but a missing or invalid token is not an error — it just means
// the request continues unauthenticated. Routes read getAuthPrincipal(res) and branch on undefined.
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith(BEARER_PREFIX)) return next();

  const token = authHeader.slice(BEARER_PREFIX.length).trim();
  if (!token) return next();

  try {
    const decoded = verifyToken(token);
    if (isJWTPayload(decoded) && decoded.role) {
      res.locals.auth = { userId: decoded.sub, role: decoded.role } satisfies AuthPrincipal;
    }
  } catch {
    // Invalid/expired token on a public route: proceed unauthenticated instead of failing the request.
  }

  next();
};
