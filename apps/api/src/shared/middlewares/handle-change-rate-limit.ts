import type { NextFunction, Request, Response } from "express";

import { rateLimit } from "./rate-limit.js";
import { getAuthPrincipal } from "./require-auth.js";

const HANDLE_CHANGE_WINDOW_MS = 24 * 60 * 60 * 1000;
const HANDLE_CHANGE_MAX_REQUESTS = 10;

const handleChangeRateLimit = rateLimit({
  namespace: "handle-change",
  windowMs: HANDLE_CHANGE_WINDOW_MS,
  max: HANDLE_CHANGE_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many username changes. Please wait a moment and try again.",
});

export const rateLimitHandleChangesOnly = (req: Request, res: Response, next: NextFunction) => {
  if (typeof req.body !== "object" || req.body === null || req.body.handle === undefined) {
    return next();
  }
  return handleChangeRateLimit(req, res, next);
};
