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
  const failureCount = await getFailedLoginCount(email);
  return failureCount >= LOGIN_LOCKOUT_THRESHOLD;
};

export const getFailedLoginCount = async (email: string): Promise<number> => {
  try {
    const rawFailureCount = await redis.get(redisKeys.loginLockout(normalizeEmail(email)));
    return rawFailureCount === null ? 0 : Number(rawFailureCount);
  } catch (error) {
    logger.error(`Failed to read login failure count: ${describeError(error)}`);
    return 0;
  }
};
