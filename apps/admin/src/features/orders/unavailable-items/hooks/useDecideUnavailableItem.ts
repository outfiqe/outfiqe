import { toast } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/lib/apiClient";
import { getErrorMessage } from "@/lib/errorMessages";

import { REFUND_QUEUE_QUERY_KEY } from "../../refunds/constants/refundQueryKeys";
import { unavailableItemsApi } from "../api/unavailableItemsApi";
import type { UnavailableItemRequest } from "../api/unavailableItemsSchemas";
import { UNAVAILABLE_ITEMS_QUERY_KEY } from "../constants/unavailableItemLabels";

type UnavailableItemDecision =
  { requestId: string; isApproved: true } | { requestId: string; isApproved: false; note: string };

export const useDecideUnavailableItem = () =>
  useApiMutation<UnavailableItemRequest, ApiClientError, UnavailableItemDecision>({
    successMessage: (_decided, decision) =>
      decision.isApproved ? "Approved. The customer is being refunded." : "Report rejected.",
    mutationFn: (decision) =>
      decision.isApproved
        ? unavailableItemsApi.approve(decision.requestId)
        : unavailableItemsApi.reject(decision.requestId, decision.note),
    invalidateKeys: [UNAVAILABLE_ITEMS_QUERY_KEY, ["admin-orders"], REFUND_QUEUE_QUERY_KEY],
    onError: (error) => toast.error(getErrorMessage(error)),
  });
