"use client";

import { useApiMutation } from "@outfiqe/hooks";
import { useQueryClient } from "@tanstack/react-query";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { type AdvanceShipmentInput, brandFulfilmentApi } from "../api/brandFulfilmentApi";
import type { BrandShipmentDetail } from "../api/brandFulfilmentSchemas";
import { brandShipmentQueryKey } from "./useBrandShipment";
import { BRAND_SHIPMENTS_QUERY_KEY } from "./useBrandShipments";

export const useAdvanceShipment = (groupId: string) => {
  const queryClient = useQueryClient();

  return useApiMutation<BrandShipmentDetail, ApiClientError, AdvanceShipmentInput>({
    mutationFn: (input) => brandFulfilmentApi.advance(groupId, input),
    invalidateKeys: [BRAND_SHIPMENTS_QUERY_KEY],
    onSuccess: (shipment) => queryClient.setQueryData(brandShipmentQueryKey(groupId), shipment),
  });
};
