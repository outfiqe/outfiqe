import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/lib/apiClient";

import { PARCELS_QUERY_KEY } from "../../shipments/constants/parcelQueryKeys";
import { hubOperationsApi } from "../api/hubOperationsApi";
import type { PackedParcel, PackParcelBody } from "../api/hubOperationsSchemas";
import { ORDERS_TO_PACK_QUERY_KEY } from "../constants/hubOperationQueryKeys";

export const usePackParcel = (orderId: string) =>
  useApiMutation<PackedParcel, ApiClientError, PackParcelBody>({
    mutationFn: (body) => hubOperationsApi.packParcel(orderId, body),
    invalidateKeys: [ORDERS_TO_PACK_QUERY_KEY, PARCELS_QUERY_KEY],
  });
