import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { withdrawRequestsApi } from "../api/withdrawRequestsApi";
import type { WithdrawRequestStatusValue } from "../api/withdrawRequestsSchemas";

export const useInfiniteWithdrawRequests = (status: WithdrawRequestStatusValue) => {
  return useInfiniteCursorPage(["withdraw-requests", status], (cursor) =>
    withdrawRequestsApi.list(status, cursor),
  );
};
