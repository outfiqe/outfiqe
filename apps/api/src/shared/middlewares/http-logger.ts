import type { NextFunction, Request, Response } from "express";

import { redactSensitiveQueryParams } from "#lib/log-redaction.utils.js";
import logger from "#lib/winston.utils.js";

export const httpLogger = (req: Request, res: Response, next: NextFunction) => {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    logger.http(
      `${req.method} ${redactSensitiveQueryParams(req.originalUrl)} ${res.statusCode} ${durationMs.toFixed(1)}ms`,
    );
  });

  next();
};
