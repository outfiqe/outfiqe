import { redis } from "./redis.client.js";

export const cacheService = {
  async get<T>(key: string): Promise<T | null> {
    const raw = await redis.get(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  },

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  },

  async touch(key: string, ttlSeconds: number): Promise<void> {
    await redis.expire(key, ttlSeconds);
  },

  async invalidate(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    await redis.del(...keys);
  },

  async withLock<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T | null> {
    const acquired = await redis.set(key, "1", "PX", ttlMs, "NX");
    if (!acquired) return null;
    try {
      return await fn();
    } finally {
      await redis.del(key);
    }
  },
};
