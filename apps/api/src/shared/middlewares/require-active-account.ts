import type { NextFunction, Request, Response } from "express";

import logger from "#lib/winston.utils.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";
import { describeError } from "#redis/redis.utils.js";

import { requireAuth, requireAuthPrincipal } from "./require-auth.js";

const FORBIDDEN_STATUS = 403;

type SuspensionFlag = { reason: string; expiresAt: string | null };

const isSuspensionFlag = (value: unknown): value is SuspensionFlag =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { reason?: unknown }).reason === "string";

export const requireActiveAccount = async (
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const { userId } = requireAuthPrincipal(res);

  try {
    const raw = await redis.get(redisKeys.suspendedUser(userId));
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      const { reason, expiresAt } = isSuspensionFlag(parsed)
        ? parsed
        : { reason: "This account has been suspended.", expiresAt: null };

      res.status(FORBIDDEN_STATUS).json({
        success: false,
        message: "This account has been suspended.",
        code: "ACCOUNT_SUSPENDED",
        details: { reason, expiresAt },
      });
      return;
    }
  } catch (error) {
    logger.error(`Suspension flag check failed for user ${userId}: ${describeError(error)}`);
  }

  next();
};

export const requireActiveAuth = [requireAuth, requireActiveAccount] as const;
