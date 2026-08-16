"use client";

import { useQuery } from "@tanstack/react-query";

import { orderFeeSettingsApi } from "../api/orderFeeSettingsApi";

const ORDER_FEE_SETTINGS_STALE_TIME_MS = 5 * 60 * 1000;

export const useOrderFeeSettings = () => {
  return useQuery({
    queryKey: ["order-fee-settings"],
    queryFn: orderFeeSettingsApi.get,
    staleTime: ORDER_FEE_SETTINGS_STALE_TIME_MS,
  });
};
