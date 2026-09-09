"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { type AdvanceShipmentInput, brandFulfilmentApi } from "../api/brandFulfilmentApi";
import type { BrandShipmentDetail } from "../api/brandFulfilmentSchemas";
import { brandShipmentQueryKey } from "./useBrandShipment";
import { BRAND_SHIPMENTS_QUERY_KEY } from "./useBrandShipments";

export const useAdvanceShipment = (groupId: string) => {
  const queryClient = useQueryClient();

  return useMutation<BrandShipmentDetail, ApiClientError, AdvanceShipmentInput>({
    mutationFn: (input) => brandFulfilmentApi.advance(groupId, input),
    onSuccess: (shipment) => {
      queryClient.setQueryData(brandShipmentQueryKey(groupId), shipment);
      void queryClient.invalidateQueries({ queryKey: BRAND_SHIPMENTS_QUERY_KEY });
    },
  });
};
