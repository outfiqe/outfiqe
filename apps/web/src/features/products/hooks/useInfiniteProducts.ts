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
  thrift?: boolean;
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
  thrift,
  enabled = true,
}: UseInfiniteProductsParams) => {
  return useInfiniteCursorPage(
    ["products", category, type, sort, q, minPrice, maxPrice, inStock, thrift],
    (cursor) =>
      productsApi.list({ category, type, sort, q, minPrice, maxPrice, inStock, thrift, cursor }),
    enabled,
  );
};
