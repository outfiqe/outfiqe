import type { NextFunction, Request, Response } from "express";

import { IDEMPOTENCY_HEADER } from "#constants/http.constants.js";

import { AppError } from "./error-handler.js";

const BAD_REQUEST_STATUS = 400;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

const missingIdempotencyKeyError = () =>
  new AppError(
    "IDEMPOTENCY_KEY_REQUIRED",
    `Send a unique ${IDEMPOTENCY_HEADER} header (8 to 128 letters, numbers, - or _) with this request.`,
    BAD_REQUEST_STATUS,
  );

export const readRequiredIdempotencyKey = (req: Request): string => {
  const key = req.get(IDEMPOTENCY_HEADER);
  if (!key || !IDEMPOTENCY_KEY_PATTERN.test(key)) throw missingIdempotencyKeyError();
  return key;
};

export const requireIdempotencyKey = (req: Request, _res: Response, next: NextFunction) => {
  try {
    readRequiredIdempotencyKey(req);
    next();
  } catch (error) {
    next(error);
  }
};
