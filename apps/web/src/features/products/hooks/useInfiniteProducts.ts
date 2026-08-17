"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";
import type { ProductSort } from "@outfiqe/utils";

import { productsApi } from "../api/productsApi";

type UseInfiniteProductsParams = {
  category?: string;
  type?: string;
  sort?: ProductSort;
  enabled?: boolean;
};

export const useInfiniteProducts = ({
  category,
  type,
  sort,
  enabled = true,
}: UseInfiniteProductsParams) => {
  return useInfiniteCursorPage(
    ["products", category, type, sort],
    (cursor) => productsApi.list({ category, type, sort, cursor }),
    enabled,
  );
};
