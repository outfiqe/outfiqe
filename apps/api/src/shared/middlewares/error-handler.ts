import type { ErrorRequestHandler } from "express";

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

    res.status(err.status).json({
      success: false,
      message: err.message,
      code: err.code,
      details: err.details,
    });
    return;
  }

  const unexpectedError = err instanceof Error ? (err.stack ?? err.message) : String(err);
  logger.error(`UNHANDLED_ERROR: ${unexpectedError}`);

  res.status(SERVER_ERROR_THRESHOLD).json({
    success: false,
    message: "Internal server error",
    code: "INTERNAL_ERROR",
  });
};
