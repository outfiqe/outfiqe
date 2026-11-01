"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { useAuth } from "@/features/auth";

import { brandProductsApi } from "../api/brandProductsApi";

export const useBrandProducts = (search?: string) => {
  const { isAuthenticated } = useAuth();

  return useInfiniteCursorPage(
    search ? ["brand-products", search] : ["brand-products"],
    (cursor) => brandProductsApi.list(cursor, search),
    isAuthenticated,
  );
};
