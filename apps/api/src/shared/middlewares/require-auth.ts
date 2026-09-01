import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { prisma } from "#db/prisma.js";
import { isJWTPayload, verifyToken } from "#lib/verify-token.utils.js";
import type {
  AuthPrincipal,
  ImpersonationActor,
  ImpersonationContext,
} from "#types/token.types.js";

import { AppError } from "./error-handler.js";

const BEARER_PREFIX = "Bearer ";
const UNAUTHORIZED_STATUS = 401;
const UNAUTHORIZED_MESSAGE = "Authentication required.";

const resolveImpersonation = async (
  actor: ImpersonationActor,
  tokenSubject: string,
): Promise<ImpersonationContext> => {
  const session = await prisma.impersonationSession.findUnique({
    where: { id: actor.sid },
    select: { revokedAt: true, expiresAt: true, organizationId: true, targetUserId: true },
  });

  if (
    !session ||
    session.revokedAt !== null ||
    session.expiresAt <= new Date() ||
    session.targetUserId !== tokenSubject
  ) {
    throw new AppError(
      "IMPERSONATION_ENDED",
      "This impersonation session is no longer valid.",
      UNAUTHORIZED_STATUS,
    );
  }

  return {
    sessionId: actor.sid,
    byUserId: actor.sub,
    organizationId: session.organizationId,
    scope: actor.scope,
  };
};

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith(BEARER_PREFIX)) {
    return next(new AppError("UNAUTHORIZED", UNAUTHORIZED_MESSAGE, UNAUTHORIZED_STATUS));
  }

  const token = authHeader.slice(BEARER_PREFIX.length).trim();
  if (!token) {
    return next(new AppError("UNAUTHORIZED", UNAUTHORIZED_MESSAGE, UNAUTHORIZED_STATUS));
  }

  let decoded;
  try {
    decoded = verifyToken(token);
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
    return next(new AppError("UNAUTHORIZED", UNAUTHORIZED_MESSAGE, UNAUTHORIZED_STATUS));
  }

  if (!isJWTPayload(decoded) || !decoded.role) {
    return next(new AppError("UNAUTHORIZED", UNAUTHORIZED_MESSAGE, UNAUTHORIZED_STATUS));
  }

  const principal: AuthPrincipal = { userId: decoded.sub, role: decoded.role };

  if (decoded.act?.via === "impersonation") {
    try {
      principal.impersonation = await resolveImpersonation(decoded.act, decoded.sub);
    } catch (error) {
      return next(error);
    }
  }

  res.locals.auth = principal;
  next();
};

export const getAuthPrincipal = (res: Response): AuthPrincipal | undefined => res.locals.auth;

export const requireAuthPrincipal = (res: Response): AuthPrincipal => {
  const principal = getAuthPrincipal(res);
  if (!principal) throw new Error("reached without an auth principal");
  return principal;
};
