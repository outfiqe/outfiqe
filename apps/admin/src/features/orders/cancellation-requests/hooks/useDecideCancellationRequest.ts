import { toast } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/lib/apiClient";
import { getErrorMessage } from "@/lib/errorMessages";

import { REFUND_QUEUE_QUERY_KEY } from "../../refunds/constants/refundQueryKeys";
import { cancellationRequestsApi } from "../api/cancellationRequestsApi";
import type { CancellationDecision } from "../api/cancellationRequestsSchemas";
import { CANCELLATION_REQUESTS_QUERY_KEY } from "../constants/cancellationRequestLabels";

type CancellationRequestDecision =
  | { fulfilmentGroupId: string; isApproved: true }
  | { fulfilmentGroupId: string; isApproved: false; note: string };

export const useDecideCancellationRequest = () =>
  useApiMutation<CancellationDecision, ApiClientError, CancellationRequestDecision>({
    errorMessage: getErrorMessage,
    successMessage: (_decided, decision) =>
      decision.isApproved
        ? "Approved. The customer is being refunded."
        : "Request declined. The brand can carry on.",
    mutationFn: (decision) =>
      decision.isApproved
        ? cancellationRequestsApi.approve(decision.fulfilmentGroupId)
        : cancellationRequestsApi.reject(decision.fulfilmentGroupId, decision.note),
    invalidateKeys: [CANCELLATION_REQUESTS_QUERY_KEY, ["admin-orders"], REFUND_QUEUE_QUERY_KEY],
    onError: (error) => toast.error(getErrorMessage(error)),
  });
