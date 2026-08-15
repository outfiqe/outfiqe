import type { ClientContext } from "ioredis";
import { Redis } from "ioredis";

import { env } from "#config/env.config.js";

import { attachRedisLifecycleLogging } from "./redis.utils.js";

const MAX_RETRIES_PER_REQUEST = 3;

const RETRY_BASE_DELAY_MS = 200;
const RETRY_MAX_DELAY_MS = 10_000;
const RETRY_JITTER_RATIO = 0.2;

const retryStrategy = (attempt: number): number => {
  const exponentialDelayMs = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jitterMs = Math.random() * exponentialDelayMs * RETRY_JITTER_RATIO;
  return exponentialDelayMs + jitterMs;
};

declare module "ioredis" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- must match ioredis's own declaration to merge
  interface RedisCommander<Context extends ClientContext = { type: "default" }> {
    incrWithExpiry(key: string, windowMs: number): Promise<number>;
  }
}

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: MAX_RETRIES_PER_REQUEST,
  retryStrategy,
});

redis.defineCommand("incrWithExpiry", {
  numberOfKeys: 1,
  lua: `
    local current = redis.call("INCR", KEYS[1])
    if tonumber(current) == 1 then
      redis.call("PEXPIRE", KEYS[1], ARGV[1])
    end
    return current
  `,
});

attachRedisLifecycleLogging(redis, "redis");

export const disconnectRedis = async () => {
  await redis.quit();
};
