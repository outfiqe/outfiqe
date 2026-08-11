"use client";

import { productsApi } from "../api/productsApi";
import { useInfiniteCursorPage } from "@outfiqe/shared-hooks";

export const useInfiniteProducts = (category: string, type?: string) => {
  return useInfiniteCursorPage(["products", category, type], (cursor) =>
    productsApi.list({ category, type, cursor }),
  );
};
