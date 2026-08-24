import type { ClientContext } from "ioredis";
import { Redis } from "ioredis";

import { env } from "#config/env.config.js";
import { computeBackoffDelayMs } from "#lib/backoff.utils.js";

import { attachRedisLifecycleLogging } from "./redis.utils.js";

const MAX_RETRIES_PER_REQUEST = 3;

declare module "ioredis" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- must match ioredis's own declaration to merge
  interface RedisCommander<Context extends ClientContext = { type: "default" }> {
    incrWithExpiry(key: string, windowMs: number): Promise<number>;
  }
}

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: MAX_RETRIES_PER_REQUEST,
  retryStrategy: computeBackoffDelayMs,
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
