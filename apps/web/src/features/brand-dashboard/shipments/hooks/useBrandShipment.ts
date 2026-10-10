"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/features/auth";

import { brandFulfilmentApi } from "../api/brandFulfilmentApi";

export const brandShipmentQueryKey = (groupId: string) => ["brand-shipment", groupId] as const;

export const useBrandShipment = (groupId: string) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: brandShipmentQueryKey(groupId),
    queryFn: () => brandFulfilmentApi.get(groupId),
    enabled: isAuthenticated,
  });
};
