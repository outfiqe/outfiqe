import logger from "#lib/winston.utils.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";
import { describeError } from "#redis/redis.utils.js";

import { LOGIN_LOCKOUT_THRESHOLD, LOGIN_LOCKOUT_WINDOW_MS } from "./auth.constants.js";

const normalizeEmail = (email: string): string => email.toLowerCase();

export const recordFailedLogin = async (email: string): Promise<void> => {
  try {
    await redis.incrWithExpiry(
      redisKeys.loginLockout(normalizeEmail(email)),
      LOGIN_LOCKOUT_WINDOW_MS,
    );
  } catch (error) {
    logger.error(`Failed to record login failure for lockout tracking: ${describeError(error)}`);
  }
};

export const resetFailedLogins = async (email: string): Promise<void> => {
  try {
    await redis.del(redisKeys.loginLockout(normalizeEmail(email)));
  } catch (error) {
    logger.error(`Failed to reset login lockout counter: ${describeError(error)}`);
  }
};

export const isLockedOut = async (email: string): Promise<boolean> => {
  try {
    const rawFailureCount = await redis.get(redisKeys.loginLockout(normalizeEmail(email)));
    return rawFailureCount !== null && Number(rawFailureCount) >= LOGIN_LOCKOUT_THRESHOLD;
  } catch (error) {
    logger.error(`Failed to check login lockout status: ${describeError(error)}`);
    return false;
  }
};
