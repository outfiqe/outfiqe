export const SAVED_QUERY_PARAM = {
  TAB: "tab",
} as const;

export const SAVED_TAB = {
  PRODUCTS: "products",
  POSTS: "posts",
} as const;

export type SavedTabValue = (typeof SAVED_TAB)[keyof typeof SAVED_TAB];

export const SAVED_TABS: { value: SavedTabValue; label: string }[] = [
  { value: SAVED_TAB.PRODUCTS, label: "Products" },
  { value: SAVED_TAB.POSTS, label: "Posts" },
];
