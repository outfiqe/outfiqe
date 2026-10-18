import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { refundsApi } from "../api/refundsApi";
import { REFUND_QUEUE_QUERY_KEY } from "../constants/refundQueryKeys";

export const useInfiniteRefundQueue = () =>
  useInfiniteCursorPage(REFUND_QUEUE_QUERY_KEY, (cursor) => refundsApi.listQueue(cursor));
