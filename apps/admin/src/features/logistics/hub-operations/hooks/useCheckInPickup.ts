import { useApiMutation } from "@outfiqe/hooks";
import { generateUuid } from "@outfiqe/utils";

import type { ApiClientError } from "@/lib/apiClient";

import { hubOperationsApi } from "../api/hubOperationsApi";
import type { CheckInPickupBody, PickupCheckIn } from "../api/hubOperationsSchemas";
import { ORDERS_TO_PACK_QUERY_KEY } from "../constants/hubOperationQueryKeys";

export const useCheckInPickup = () =>
  useApiMutation<PickupCheckIn, ApiClientError, CheckInPickupBody>({
    mutationFn: (body) => hubOperationsApi.checkInPickup(body, generateUuid()),
    invalidateKeys: [ORDERS_TO_PACK_QUERY_KEY],
  });
