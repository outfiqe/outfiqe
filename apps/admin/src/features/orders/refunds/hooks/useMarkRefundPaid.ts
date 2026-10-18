import { toast } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/lib/apiClient";
import { getErrorMessage } from "@/lib/errorMessages";

import { refundsApi } from "../api/refundsApi";
import type { OrderRefund } from "../api/refundsSchemas";
import { REFUND_QUEUE_QUERY_KEY } from "../constants/refundQueryKeys";

type MarkRefundPaidInput = { refundId: string; transferReference: string };

export const useMarkRefundPaid = () =>
  useApiMutation<OrderRefund, ApiClientError, MarkRefundPaidInput>({
    errorMessage: getErrorMessage,
    successMessage: "Refund marked as paid. The customer has been told.",
    mutationFn: ({ refundId, transferReference }) =>
      refundsApi.markPaid(refundId, transferReference),
    invalidateKeys: [REFUND_QUEUE_QUERY_KEY, ["admin-orders"]],
    onError: (error) => toast.error(getErrorMessage(error)),
  });
