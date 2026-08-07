import jwt from "jsonwebtoken";

import { TOKEN } from "#config/token.config.js";
import { TokenTypeEnum } from "#constants/enums/auth.enum.js";
import type { JWTPayload, TokenType } from "#types/token.types.js";

export const generateToken = (
  payload: JWTPayload,
  type: TokenType = TokenTypeEnum.ACCESS,
): string => {
  const secret =
    type === TokenTypeEnum.ACCESS ? TOKEN.ACCESS_TOKEN_SECRET : TOKEN.REFRESH_TOKEN_SECRET;
  const expiresIn =
    type === TokenTypeEnum.ACCESS ? TOKEN.ACCESS_TOKEN_EXPIRY : TOKEN.REFRESH_TOKEN_EXPIRY;

  const options: jwt.SignOptions = {
    algorithm: TOKEN.ALGORITHM as jwt.SignOptions["algorithm"],
    audience: TOKEN.AUDIENCE,
    expiresIn: expiresIn as jwt.SignOptions["expiresIn"],
    issuer: TOKEN.ISSUER,
  };

  const token = jwt.sign(payload, secret, options);
  return token;
};
