import type { Algorithm } from "jsonwebtoken";

import { env } from "./env.config.js";

export const TOKEN = {
  ACCESS_TOKEN_SECRET: env.JWT_SECRET,
  REFRESH_TOKEN_SECRET: env.JWT_SECRET,
  ACCESS_TOKEN_EXPIRY: env.JWT_ACCESS_TTL,
  REFRESH_TOKEN_EXPIRY: env.JWT_REFRESH_TTL,
  ALGORITHM: "HS256" satisfies Algorithm,
  AUDIENCE: "outfiqe-web",
  ISSUER: "outfiqe-api",
  CLOCK_TOLERANCE: 5,
} as const;
