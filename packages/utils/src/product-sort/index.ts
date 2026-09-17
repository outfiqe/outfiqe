export const PRODUCT_SORT_VALUES = ["newest", "trending", "new-arrivals", "on-sale"] as const;

export type ProductSort = (typeof PRODUCT_SORT_VALUES)[number];

export const PRODUCT_SORT = {
  NEWEST: "newest",
  TRENDING: "trending",
  NEW_ARRIVALS: "new-arrivals",
  ON_SALE: "on-sale",
} as const satisfies Record<string, ProductSort>;
