import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/lib/apiClient";

import { riderPayApi } from "../api/riderPayApi";
import type { CreateRiderPayRateBody, RiderPayRate } from "../api/riderPaySchemas";
import { RIDER_PAY_QUERY_KEY } from "../constants/riderPayQueryKeys";

export const useCreateRiderPayRate = () =>
  useApiMutation<RiderPayRate, ApiClientError, CreateRiderPayRateBody>({
    successMessage: "Pay rate saved.",
    mutationFn: riderPayApi.createRate,
    invalidateKeys: [RIDER_PAY_QUERY_KEY],
  });
