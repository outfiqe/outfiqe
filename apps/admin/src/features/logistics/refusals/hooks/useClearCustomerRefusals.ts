import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/lib/apiClient";

import { refusalsApi } from "../api/refusalsApi";
import type { CustomerRefusals } from "../api/refusalsSchemas";
import { customerRefusalsQueryKey } from "../constants/refusalQueryKeys";

export const useClearCustomerRefusals = (orderId: string) =>
  useApiMutation<CustomerRefusals, ApiClientError, string>({
    successMessage: "Refusals cleared. Cash on delivery is available again.",
    mutationFn: (reason) => refusalsApi.clearForOrder(orderId, reason),
    invalidateKeys: [customerRefusalsQueryKey(orderId)],
  });
