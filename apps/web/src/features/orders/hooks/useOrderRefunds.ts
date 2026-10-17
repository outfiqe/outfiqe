"use client";

import { useQuery } from "@tanstack/react-query";

import { ordersApi } from "../api/ordersApi";
import { orderRefundsQueryKey } from "../constants/refundQueryKeys";

export const useOrderRefunds = (orderId: string) =>
  useQuery({
    queryKey: orderRefundsQueryKey(orderId),
    queryFn: () => ordersApi.listRefunds(orderId),
  });
