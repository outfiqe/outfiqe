import type { NextFunction, Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import logger from "#lib/winston.utils.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";
import { describeError } from "#redis/redis.utils.js";

import { AppError } from "./error-handler.js";

type RateLimitOptions = {
  namespace: string;
  windowMs: number;
  max: number;
  keyGenerator: (req: Request, res: Response) => string | undefined;
  message?: string;
};

const DEFAULT_MESSAGE = "Too many requests. Please try again later.";
const MS_PER_SECOND = 1000;

export const rateLimit = ({
  namespace,
  windowMs,
  max,
  keyGenerator,
  message,
}: RateLimitOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const identifier = keyGenerator(req, res);
    if (!identifier) return next();

    const key = redisKeys.rateLimit(namespace, identifier);

    try {
      const count = await redis.incrWithExpiry(key, windowMs);

      if (count > max) {
        const ttlMs = await redis.pttl(key);
        res.setHeader("Retry-After", Math.ceil((ttlMs > 0 ? ttlMs : windowMs) / MS_PER_SECOND));

        return next(
          new AppError("RATE_LIMITED", message ?? DEFAULT_MESSAGE, HTTP_STATUS.TOO_MANY_REQUESTS),
        );
      }

      next();
    } catch (error) {
      logger.error(`Rate limit check failed for "${key}": ${describeError(error)}`);
      next();
    }
  };
};
