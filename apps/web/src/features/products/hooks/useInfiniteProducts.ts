"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";
import type { ProductSort } from "@outfiqe/utils";

import { productsApi } from "../api/productsApi";

type UseInfiniteProductsParams = {
  category?: string;
  type?: string;
  sort?: ProductSort;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  enabled?: boolean;
};

export const useInfiniteProducts = ({
  category,
  type,
  sort,
  q,
  minPrice,
  maxPrice,
  inStock,
  enabled = true,
}: UseInfiniteProductsParams) => {
  return useInfiniteCursorPage(
    ["products", category, type, sort, q, minPrice, maxPrice, inStock],
    (cursor) => productsApi.list({ category, type, sort, q, minPrice, maxPrice, inStock, cursor }),
    enabled,
  );
};
