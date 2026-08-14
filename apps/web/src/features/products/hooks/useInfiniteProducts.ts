"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { productsApi } from "../api/productsApi";

export const useInfiniteProducts = (category: string, type?: string) => {
  return useInfiniteCursorPage(
    ["products", category, type],
    (cursor) => productsApi.list({ category, type, cursor }),
    Boolean(category),
  );
};
