import type { ErrorRequestHandler } from "express";

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
    public details?: unknown
  ) {
    super(message);
  }
}

// Central place for turning thrown errors into a consistent HTTP shape.
// Every module throws AppError instead of formatting its own responses.
//
// Express 5 forwards rejected promises from async handlers here automatically,
// so route handlers no longer need an asyncHandler() wrapper.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      message: err.message,
      code: err.code,
      details: err.details,
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    message: "Internal server error",
    code: "INTERNAL_ERROR",
  });
};
