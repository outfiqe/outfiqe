import type { ApiErrorEnvelope } from "@outfiqe/types";
import type { ErrorRequestHandler } from "express";

import { Prisma } from "#generated/prisma/client.js";
import { HandleCollisionError } from "#lib/handle.utils.js";
import logger from "#lib/winston.utils.js";

const FALLBACK_STATUS = 400;
const SERVER_ERROR_THRESHOLD = 500;
const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;

interface KnownFailureResponse {
  code: string;
  message: string;
  status: number;
}

const HANDLE_COLLISION_RESPONSE: KnownFailureResponse = {
  code: "HANDLE_UNAVAILABLE",
  message: "We couldn't reserve a username right now. Please try again.",
  status: CONFLICT_STATUS,
};

const PRISMA_KNOWN_FAILURE_RESPONSES: Record<string, KnownFailureResponse> = {
  P2002: {
    code: "ALREADY_EXISTS",
    message: "A record with these details already exists.",
    status: CONFLICT_STATUS,
  },
  P2003: {
    code: "REFERENCE_CONFLICT",
    message: "This item is linked to something that prevents the change.",
    status: CONFLICT_STATUS,
  },
  P2025: {
    code: "NOT_FOUND",
    message: "The requested record could not be found.",
    status: NOT_FOUND_STATUS,
  },
};

const resolveKnownFailure = (err: unknown): KnownFailureResponse | null => {
  if (err instanceof HandleCollisionError) return HANDLE_COLLISION_RESPONSE;
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return PRISMA_KNOWN_FAILURE_RESPONSES[err.code] ?? null;
  }
  return null;
};

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

  const knownFailure = resolveKnownFailure(err);
  if (knownFailure) {
    const { code, message, status } = knownFailure;
    logger.warn(`${code}: ${err instanceof Error ? err.message : String(err)}`);

    const body: ApiErrorEnvelope = { success: false, message, code };
    res.status(status).json(body);
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
