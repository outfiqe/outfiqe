import type { ErrorRequestHandler } from "express";
import type { ApiErrorEnvelope } from "@outfiqe/shared-types";

import logger from "#lib/winston.utils.js";

const FALLBACK_STATUS = 400;
const SERVER_ERROR_THRESHOLD = 500;

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = FALLBACK_STATUS,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    const level = err.status >= SERVER_ERROR_THRESHOLD ? "error" : "warn";
    logger[level](`${err.code}: ${err.message}`);

    const body: ApiErrorEnvelope = {
      success: false,
      message: err.message,
      code: err.code,
      details: err.details,
    };
    res.status(err.status).json(body);
    return;
  }

  const unexpectedError = err instanceof Error ? (err.stack ?? err.message) : String(err);
  logger.error(`UNHANDLED_ERROR: ${unexpectedError}`);

  const body: ApiErrorEnvelope = {
    success: false,
    message: "Internal server error",
    code: "INTERNAL_ERROR",
  };
  res.status(SERVER_ERROR_THRESHOLD).json(body);
};
