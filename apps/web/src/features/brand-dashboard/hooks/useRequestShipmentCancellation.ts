"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { brandFulfilmentApi } from "../api/brandFulfilmentApi";
import { brandShipmentQueryKey } from "./useBrandShipment";
import { BRAND_SHIPMENTS_QUERY_KEY } from "./useBrandShipments";

export const useRequestShipmentCancellation = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation<void, ApiClientError, string>({
    mutationFn: (reason) => brandFulfilmentApi.requestCancellation(groupId, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: brandShipmentQueryKey(groupId) });
      void queryClient.invalidateQueries({ queryKey: BRAND_SHIPMENTS_QUERY_KEY });
    },
  });
};
