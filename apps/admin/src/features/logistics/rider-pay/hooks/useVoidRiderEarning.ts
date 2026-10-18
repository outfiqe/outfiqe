import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/lib/apiClient";

import { riderPayApi } from "../api/riderPayApi";
import type { RiderEarning } from "../api/riderPaySchemas";
import { RIDER_PAY_QUERY_KEY } from "../constants/riderPayQueryKeys";

export const useVoidRiderEarning = () =>
  useApiMutation<RiderEarning, ApiClientError, { earningId: string; reason: string }>({
    successMessage: "Earning voided.",
    mutationFn: ({ earningId, reason }) => riderPayApi.voidEarning(earningId, reason),
    invalidateKeys: [RIDER_PAY_QUERY_KEY],
  });
