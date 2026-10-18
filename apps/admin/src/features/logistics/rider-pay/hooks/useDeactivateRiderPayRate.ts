import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/lib/apiClient";

import { riderPayApi } from "../api/riderPayApi";
import type { RiderPayRate } from "../api/riderPaySchemas";
import { RIDER_PAY_QUERY_KEY } from "../constants/riderPayQueryKeys";

export const useDeactivateRiderPayRate = () =>
  useApiMutation<RiderPayRate, ApiClientError, string>({
    successMessage: "Pay rate switched off.",
    mutationFn: riderPayApi.deactivateRate,
    invalidateKeys: [RIDER_PAY_QUERY_KEY],
  });
