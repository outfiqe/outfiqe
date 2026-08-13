"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { useAuth } from "@/features/auth";
import { brandProductsApi } from "../api/brandProductsApi";

export const useBrandProducts = () => {
  const { isAuthenticated } = useAuth();

  return useInfiniteCursorPage(
    ["brand-products"],
    (cursor) => brandProductsApi.list(cursor),
    isAuthenticated,
  );
};
