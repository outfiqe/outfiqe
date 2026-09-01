import jwt from "jsonwebtoken";

import { TOKEN } from "#config/token.config.js";
import { UserRole } from "#generated/prisma/enums.js";

import {
  IMPERSONATION_ACTOR_VIA,
  type ImpersonationScope,
} from "./platform-impersonation.constants.js";

export const mintImpersonationToken = (params: {
  targetUserId: string;
  impersonatorId: string;
  sessionId: string;
  scope: ImpersonationScope;
  ttlSeconds: number;
}): string =>
  jwt.sign(
    {
      sub: params.targetUserId,
      role: UserRole.ADMIN,
      act: {
        sub: params.impersonatorId,
        via: IMPERSONATION_ACTOR_VIA,
        sid: params.sessionId,
        scope: params.scope,
      },
    },
    TOKEN.ACCESS_TOKEN_SECRET,
    {
      algorithm: TOKEN.ALGORITHM,
      audience: TOKEN.AUDIENCE,
      issuer: TOKEN.ISSUER,
      expiresIn: params.ttlSeconds,
    },
  );
