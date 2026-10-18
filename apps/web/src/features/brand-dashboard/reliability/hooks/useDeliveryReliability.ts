"use client";

import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { reliabilityApi } from "../api/reliabilityApi";

export const DELIVERY_RELIABILITY_QUERY_KEY = ["brand-delivery-reliability"] as const;

export const useDeliveryReliability = () =>
  useInfiniteCursorPage(DELIVERY_RELIABILITY_QUERY_KEY, (cursor) => reliabilityApi.getMine(cursor));
