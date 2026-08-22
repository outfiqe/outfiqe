import type { ApiSuccessEnvelope } from "@outfiqe/types";
import type { NextFunction, Request, Response } from "express";

import { redisKeys } from "#redis/redis.keys.js";
import { cacheStrategy } from "#redis/strategies/index.js";

const DEFAULT_CACHE_KEY = "all";
const SUCCESS_STATUS_MIN = 200;
const SUCCESS_STATUS_MAX = 300;

const isSuccessStatus = (status: number) =>
  status >= SUCCESS_STATUS_MIN && status < SUCCESS_STATUS_MAX;

const isSuccessEnvelope = (body: unknown): body is ApiSuccessEnvelope<unknown> =>
  typeof body === "object" &&
  body !== null &&
  "success" in body &&
  body.success === true &&
  "data" in body;

type CacheOptions = {
  namespace: string;
  ttlSeconds: number;
  key?: string;
  successMessage: string;
};

export const cache = ({
  namespace,
  ttlSeconds,
  key = DEFAULT_CACHE_KEY,
  successMessage,
}: CacheOptions) => {
  const cacheKey = redisKeys.cache(namespace, key);

  return async (_req: Request, res: Response, next: NextFunction) => {
    const cachedData = await cacheStrategy.read<unknown>(cacheKey);
    if (cachedData !== null) {
      res.json({ success: true, message: successMessage, data: cachedData });
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (isSuccessStatus(res.statusCode) && isSuccessEnvelope(body)) {
        void cacheStrategy.refresh(cacheKey, ttlSeconds, async () => body.data);
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
