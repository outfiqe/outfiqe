"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { useAuth } from "@/features/auth";

import { brandFulfilmentApi } from "../api/brandFulfilmentApi";

export const BRAND_SHIPMENTS_QUERY_KEY = ["brand-shipments"] as const;

export const useBrandShipments = () => {
  const { isAuthenticated } = useAuth();

  return useInfiniteCursorPage(
    BRAND_SHIPMENTS_QUERY_KEY,
    (cursor) => brandFulfilmentApi.list(cursor),
    isAuthenticated,
  );
};
