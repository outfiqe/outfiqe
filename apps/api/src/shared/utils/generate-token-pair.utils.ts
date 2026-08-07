import { TokenTypeEnum } from "#constants/enums/auth.enum.js";
import type { JWTPayload, TokenPair } from "#types/token.types.js";

import { generateToken } from "./generate-token.utils.js";

export const generateTokenpair = (payload: JWTPayload): TokenPair => {
  const tokens = {
    accessToken: generateToken({ ...payload }, TokenTypeEnum.ACCESS),
    refreshToken: generateToken({ ...payload }, TokenTypeEnum.REFRESH),
  };
  return tokens;
};
