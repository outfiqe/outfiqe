"use client";

import { useQuery } from "@tanstack/react-query";

import { ordersApi } from "../api/ordersApi";
import { orderTrackingQueryKey } from "../constants/trackingQueryKeys";

export const useOrderTracking = (orderId: string) =>
  useQuery({
    queryKey: orderTrackingQueryKey(orderId),
    queryFn: () => ordersApi.getTracking(orderId),
  });
