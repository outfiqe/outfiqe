"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { useAuth } from "@/features/auth";

import { brandFulfilmentApi } from "../api/brandFulfilmentApi";

export const BRAND_SHIPMENTS_QUERY_KEY = ["brand-shipments"] as const;

export const useBrandShipments = (search?: string) => {
  const { isAuthenticated } = useAuth();

  return useInfiniteCursorPage(
    search ? [...BRAND_SHIPMENTS_QUERY_KEY, search] : BRAND_SHIPMENTS_QUERY_KEY,
    (cursor) => brandFulfilmentApi.list(cursor, search),
    isAuthenticated,
  );
};
