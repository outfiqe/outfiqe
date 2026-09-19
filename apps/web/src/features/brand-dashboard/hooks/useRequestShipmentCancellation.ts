"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { brandFulfilmentApi } from "../api/brandFulfilmentApi";
import { brandShipmentQueryKey } from "./useBrandShipment";
import { BRAND_SHIPMENTS_QUERY_KEY } from "./useBrandShipments";

export const useRequestShipmentCancellation = (groupId: string) =>
  useApiMutation<void, ApiClientError, string>({
    mutationFn: (reason) => brandFulfilmentApi.requestCancellation(groupId, reason),
    invalidateKeys: [brandShipmentQueryKey(groupId), BRAND_SHIPMENTS_QUERY_KEY],
  });
