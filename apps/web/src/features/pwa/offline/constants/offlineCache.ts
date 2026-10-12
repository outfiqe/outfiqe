export const PERSISTED_QUERY_CACHE_KEY = "outfiqe-offline-reading";

export const PERSISTED_CACHE_VERSION = "1";

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;

export const PERSISTED_CACHE_MAX_AGE_MS = MILLISECONDS_PER_DAY;

export const PERSISTABLE_QUERY_ROOTS = [
  "products",
  "categories",
  "brand-products",
  "explore-feed",
  "creator-looks",
  "creator-leaderboard",
];

export const isPersistableQueryKey = (queryKey: readonly unknown[]): boolean => {
  const [root] = queryKey;
  return typeof root === "string" && PERSISTABLE_QUERY_ROOTS.includes(root);
};
