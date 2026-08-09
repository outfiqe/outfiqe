"use client";

import { productsApi } from "../api/productsApi";
import { useInfiniteProductPage } from "./useInfiniteProductPage";

export const useInfiniteProducts = (category: string, type?: string) => {
  return useInfiniteProductPage(["products", category, type], (cursor) =>
    productsApi.list({ category, type, cursor }),
  );
};
