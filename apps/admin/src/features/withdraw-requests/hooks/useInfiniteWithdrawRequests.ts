import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { withdrawRequestsApi } from "../api";
import type { WithdrawRequestStatusValue } from "../schemas";

export const useInfiniteWithdrawRequests = (status: WithdrawRequestStatusValue) => {
  return useInfiniteCursorPage(["withdraw-requests", status], (cursor) =>
    withdrawRequestsApi.list(status, cursor),
  );
};
