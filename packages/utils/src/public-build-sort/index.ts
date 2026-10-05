export const PUBLIC_BUILD_SORT = {
  NEWEST: "newest",
  MOST_CHERIQED: "most-cheriqed",
  PRICE_LOW: "price-low",
  PRICE_HIGH: "price-high",
} as const;

export type PublicBuildSort = (typeof PUBLIC_BUILD_SORT)[keyof typeof PUBLIC_BUILD_SORT];
