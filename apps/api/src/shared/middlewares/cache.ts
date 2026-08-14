import type { NextFunction, Request, Response } from "express";

import { redisKeys } from "#redis/redis.keys.js";
import { cacheStrategy } from "#redis/strategies/index.js";

const DEFAULT_CACHE_KEY = "all";
const SUCCESS_STATUS_MIN = 200;
const SUCCESS_STATUS_MAX = 300;

const isSuccessStatus = (status: number) =>
  status >= SUCCESS_STATUS_MIN && status < SUCCESS_STATUS_MAX;

type CacheOptions = {
  namespace: string;
  ttlSeconds: number;
  key?: string;
};

/*
Read side: serves a cache hit as-is; on a miss, lets the request through and
write-through's the response body once the handler sends it, so the next
request is a hit. Intended for GET routes only.
*/
export const cache = ({ namespace, ttlSeconds, key = DEFAULT_CACHE_KEY }: CacheOptions) => {
  const cacheKey = redisKeys.cache(namespace, key);

  return async (_req: Request, res: Response, next: NextFunction) => {
    const cached = await cacheStrategy.read<unknown>(cacheKey);
    if (cached !== null) {
      res.json(cached);
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (isSuccessStatus(res.statusCode)) {
        void cacheStrategy.refresh(cacheKey, ttlSeconds, async () => body);
      }
      return originalJson(body);
    };

    next();
  };
};

type RefreshCacheOnWriteOptions<T> = {
  namespace: string;
  ttlSeconds: number;
  key?: string;
  load: () => Promise<T>;
};

/*
Write side: on a successful mutation, eagerly recomputes and re-stores the
cache entry (write-through) instead of merely invalidating it, so readers
never hit a cold cache right after a write. Runs after the response is sent.
*/
export const refreshCacheOnWrite = <T>({
  namespace,
  ttlSeconds,
  key = DEFAULT_CACHE_KEY,
  load,
}: RefreshCacheOnWriteOptions<T>) => {
  const cacheKey = redisKeys.cache(namespace, key);

  return (_req: Request, res: Response, next: NextFunction) => {
    res.on("finish", () => {
      if (isSuccessStatus(res.statusCode)) {
        void cacheStrategy.refresh(cacheKey, ttlSeconds, load);
      }
    });
    next();
  };
};
