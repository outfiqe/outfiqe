"use client";

import { useQuery } from "@tanstack/react-query";

import { ordersApi } from "../api/ordersApi";
import { orderQueryKey } from "../constants/trackingQueryKeys";

export const useOrder = (orderId: string) => {
  return useQuery({
    queryKey: orderQueryKey(orderId),
    queryFn: () => ordersApi.get(orderId),
  });
};
