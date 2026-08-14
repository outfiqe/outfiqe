import type { ExtendedError } from "socket.io";

import logger from "#lib/winston.utils.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";
import { describeError } from "#redis/redis.utils.js";

import { SOCKET_RATE_LIMIT } from "./socket.keys.js";
import type { AppSocket } from "./socket.types.js";

const TOO_MANY_CONNECTIONS_MESSAGE = "Too many connection attempts. Please try again shortly.";

export const socketConnectionRateLimit = async (
  socket: AppSocket,
  next: (err?: ExtendedError) => void,
) => {
  const ip = socket.handshake.address;
  if (!ip) return next();

  const key = redisKeys.rateLimit(SOCKET_RATE_LIMIT.NAMESPACE, ip);

  try {
    const count = await redis.incrWithExpiry(key, SOCKET_RATE_LIMIT.WINDOW_MS);
    if (count > SOCKET_RATE_LIMIT.MAX_CONNECTIONS) {
      return next(new Error(TOO_MANY_CONNECTIONS_MESSAGE));
    }
    next();
  } catch (error) {
    logger.error(`Socket rate limit check failed for "${key}": ${describeError(error)}`);
    next();
  }
};
