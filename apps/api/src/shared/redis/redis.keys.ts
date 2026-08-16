export const redisKeys = {
  rateLimit: (namespace: string, identifier: string) => `ratelimit:${namespace}:${identifier}`,
  cache: (namespace: string, identifier = "all") => `cache:${namespace}:${identifier}`,
  stream: (event: string) => `stream:${event}`,
  lock: (name: string) => `lock:${name}`,
};

export const CACHE_TTL = {
  CATEGORIES_PUBLIC: 300,
  HERO_SLIDES_PUBLIC: 300,
  TRENDING_TAGS: 600,
  EXPLORE_TRENDING_SNAPSHOT: 1200,
  DELIVERY_ZONES_PUBLIC: 300,
} as const;
