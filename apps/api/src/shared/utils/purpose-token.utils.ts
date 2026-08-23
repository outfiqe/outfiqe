import { randomUUID } from "node:crypto";

import type { JwtPayload } from "jsonwebtoken";
import jwt from "jsonwebtoken";

import { env } from "#config/env.config.js";
import { TOKEN } from "#config/token.config.js";
import { TokenPurpose } from "#constants/enums/auth.enum.js";
import type { PurposeTokenPayload } from "#types/token.types.js";

type SignPurposeTokenInput = {
  sub: string;
  purpose: TokenPurpose;
};

const isPurposeTokenPayload = (payload: JwtPayload): payload is PurposeTokenPayload =>
  typeof payload.sub === "string" &&
  typeof payload.jti === "string" &&
  (payload.purpose === TokenPurpose.EMAIL_VERIFICATION ||
    payload.purpose === TokenPurpose.PASSWORD_RESET);

export const signPurposeToken = (payload: SignPurposeTokenInput, expiresIn: string): string => {
  const options: jwt.SignOptions = {
    algorithm: TOKEN.ALGORITHM,
    audience: TOKEN.AUDIENCE,
    issuer: TOKEN.ISSUER,
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
    jwtid: randomUUID(),
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
};

export const verifyPurposeToken = (token: string): PurposeTokenPayload => {
  const options: jwt.VerifyOptions = {
    algorithms: [TOKEN.ALGORITHM],
    audience: TOKEN.AUDIENCE,
    issuer: TOKEN.ISSUER,
    clockTolerance: TOKEN.CLOCK_TOLERANCE,
  };

  const decoded = jwt.verify(token, env.JWT_SECRET, options);

  if (typeof decoded === "string" || !isPurposeTokenPayload(decoded)) {
    throw new jwt.JsonWebTokenError("Token payload is missing required claims");
  }

  return decoded;
};
