"use client";

import { useQuery } from "@tanstack/react-query";

import { ordersApi } from "../api/ordersApi";
import { refundDestinationQueryKey } from "../constants/refundQueryKeys";

export const useRefundDestination = (orderId: string, isEnabled: boolean) =>
  useQuery({
    queryKey: refundDestinationQueryKey(orderId),
    queryFn: () => ordersApi.getRefundDestination(orderId),
    enabled: isEnabled,
  });
