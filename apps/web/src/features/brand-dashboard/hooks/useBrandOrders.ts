"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { useAuth } from "@/features/auth";

import { brandOrdersApi } from "../api/brandOrdersApi";

export const useBrandOrders = () => {
  const { isAuthenticated } = useAuth();

  return useInfiniteCursorPage(
    ["brand-orders"],
    (cursor) => brandOrdersApi.list(cursor),
    isAuthenticated,
  );
};
