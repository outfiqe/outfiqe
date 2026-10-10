import type { ApiErrorEnvelope } from "@outfiqe/types";
import type { ErrorRequestHandler } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { Prisma } from "#generated/prisma/client.js";
import { HandleCollisionError } from "#lib/handle.utils.js";
import logger from "#lib/winston.utils.js";

const FALLBACK_STATUS = HTTP_STATUS.BAD_REQUEST;
const SERVER_ERROR_THRESHOLD = 500;

interface KnownFailureResponse {
  code: string;
  message: string;
  status: number;
}

const HANDLE_COLLISION_RESPONSE: KnownFailureResponse = {
  code: "HANDLE_UNAVAILABLE",
  message: "We couldn't reserve a username right now. Please try again.",
  status: HTTP_STATUS.CONFLICT,
};

const PRISMA_KNOWN_FAILURE_RESPONSES: Record<string, KnownFailureResponse> = {
  P2002: {
    code: "ALREADY_EXISTS",
    message: "A record with these details already exists.",
    status: HTTP_STATUS.CONFLICT,
  },
  P2003: {
    code: "REFERENCE_CONFLICT",
    message: "This item is linked to something that prevents the change.",
    status: HTTP_STATUS.CONFLICT,
  },
  P2025: {
    code: "NOT_FOUND",
    message: "The requested record could not be found.",
    status: HTTP_STATUS.NOT_FOUND,
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
