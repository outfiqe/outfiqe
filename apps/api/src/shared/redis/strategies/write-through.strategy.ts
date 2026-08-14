import logger from "#lib/winston.utils.js";

import { cacheService } from "../cache.service.js";
import { describeError } from "../redis.utils.js";
import type { CacheStrategy } from "./cache-strategy.types.js";

/*
Write-through: every successful write recomputes and stores the fresh value
immediately, so the cache is never left cold after an invalidation. Reads
never populate the cache themselves beyond the initial miss — they read
whatever the last write (or the first read-through miss) put there.
*/
export const writeThroughStrategy: CacheStrategy = {
  async read<T>(key: string): Promise<T | null> {
    try {
      return await cacheService.get<T>(key);
    } catch (error) {
      logger.warn(`Cache read failed for "${key}": ${describeError(error)}`);
      return null;
    }
  },

  async refresh<T>(
    key: string,
    ttlSeconds: number,
    loadFresh: () => Promise<T>,
  ): Promise<T | null> {
    let value: T;
    try {
      value = await loadFresh();
    } catch (error) {
      logger.error(`Cache refresh source load failed for "${key}": ${describeError(error)}`);
      return null;
    }

    try {
      await cacheService.set(key, value, ttlSeconds);
    } catch (error) {
      logger.warn(`Cache write failed for "${key}": ${describeError(error)}`);
    }

    return value;
  },
};
