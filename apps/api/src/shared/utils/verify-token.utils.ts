import type { JwtPayload, VerifyOptions } from "jsonwebtoken";
import jwt from "jsonwebtoken";

import { TOKEN } from "#config/token.config.js";
import { TokenTypeEnum } from "#constants/enums/auth.enum.js";
import type { TokenType } from "#types/token.types.js";

export const verifyToken = (
  token: string,
  type: TokenType = TokenTypeEnum.ACCESS,
): JwtPayload | string => {
  const secret =
    type === TokenTypeEnum.ACCESS ? TOKEN.ACCESS_TOKEN_SECRET : TOKEN.REFRESH_TOKEN_SECRET;

  const options: VerifyOptions = {
    algorithms: [TOKEN.ALGORITHM] as VerifyOptions["algorithms"],
    audience: TOKEN.AUDIENCE,
    clockTolerance: Number(TOKEN.CLOCK_TOLERANCE),
    issuer: TOKEN.ISSUER,
  };

  return jwt.verify(token, secret, options);
};
