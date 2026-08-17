export const PRODUCT_SORT_VALUES = ["newest", "trending", "new-arrivals"] as const;

export type ProductSort = (typeof PRODUCT_SORT_VALUES)[number];

export const PRODUCT_SORT = {
  NEWEST: "newest",
  TRENDING: "trending",
  NEW_ARRIVALS: "new-arrivals",
} as const satisfies Record<string, ProductSort>;
