import type { NextFunction, Request, Response } from "express";
import { AppError } from "./error-handler.js";

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyGenerator: (req: Request, res: Response) => string | undefined;
  message?: string;
};

const DEFAULT_MESSAGE = "Too many requests. Please try again later.";
const TOO_MANY_REQUESTS_STATUS = 429;

/* 
TODO: Redis Later
Fixed-window, in-memory, single-process. Once the API runs more than one
instance this Map needs to move behind a shared store (Redis INCR/EXPIRE)
so counts are consistent across processes.
*/
const hits = new Map<string, { count: number; resetAt: number }>();

export const rateLimit = ({ windowMs, max, keyGenerator, message }: RateLimitOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req, res);
    if (!key) return next();

    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (entry.count >= max) {
      return next(
        new AppError("RATE_LIMITED", message ?? DEFAULT_MESSAGE, TOO_MANY_REQUESTS_STATUS),
      );
    }

    entry.count += 1;
    next();
  };
};
