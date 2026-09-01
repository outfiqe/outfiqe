import type { Request } from "express";
import type { JwtPayload } from "jsonwebtoken";

import type { TokenPurpose, TokenTypeEnum } from "#constants/enums/auth.enum.js";
import type { UserRole } from "#generated/prisma/enums.js";

export type TokenType = TokenTypeEnum;

export type ImpersonationActor = {
  sub: string;
  via: "impersonation";
  sid: string;
  scope: "read" | "write";
};

export interface JWTPayload extends JwtPayload {
  sub: string;
  role?: UserRole;
  act?: ImpersonationActor;
}

export type ImpersonationContext = {
  sessionId: string;
  byUserId: string;
  organizationId: string;
  scope: "read" | "write";
};

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

export type AuthPrincipal = {
  userId: string;
  role: UserRole;
  impersonation?: ImpersonationContext;
};

export type PurposeTokenPayload = JwtPayload & {
  sub: string;
  purpose: TokenPurpose;
  jti: string;
};
