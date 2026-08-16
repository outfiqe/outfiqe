"use client";

import { useQuery } from "@tanstack/react-query";

import { deliveryZoneApi } from "../api/deliveryZoneApi";

const DELIVERY_ZONES_STALE_TIME_MS = 5 * 60 * 1000;

export const useDeliveryZones = () => {
  return useQuery({
    queryKey: ["delivery-zones"],
    queryFn: deliveryZoneApi.list,
    staleTime: DELIVERY_ZONES_STALE_TIME_MS,
  });
};
