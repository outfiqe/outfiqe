import type { Redis } from "ioredis";

import logger from "#lib/winston.utils.js";

export const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const attachRedisLifecycleLogging = (client: Redis, label: string): void => {
  client.on("connect", () => logger.info(`Redis connected: ${label}`));
  client.on("error", (error) => logger.error(`Redis error: ${label}: ${describeError(error)}`));
  client.on("reconnecting", (delayMs: number) =>
    logger.warn(`Redis reconnecting: ${label} in ${delayMs}ms`),
  );
  client.on("end", () => logger.warn(`Redis connection closed: ${label}`));
};
