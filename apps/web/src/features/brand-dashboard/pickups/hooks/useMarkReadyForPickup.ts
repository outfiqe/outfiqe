"use client";

import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/shared/lib/apiClient";

import { brandShipmentQueryKey } from "../../shipments/hooks/useBrandShipment";
import { BRAND_SHIPMENTS_QUERY_KEY } from "../../shipments/hooks/useBrandShipments";
import { brandPickupApi } from "../api/brandPickupApi";
import type { BrandPickup } from "../api/brandPickupSchemas";

export const useMarkReadyForPickup = (fulfilmentGroupId: string) =>
  useApiMutation<BrandPickup, ApiClientError, void>({
    mutationFn: () => brandPickupApi.markReady(fulfilmentGroupId),
    invalidateKeys: [brandShipmentQueryKey(fulfilmentGroupId), BRAND_SHIPMENTS_QUERY_KEY],
  });
