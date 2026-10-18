import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { riderPayApi } from "../api/riderPayApi";
import type { RiderEarningStatus } from "../api/riderPaySchemas";
import { riderEarningsQueryKey } from "../constants/riderPayQueryKeys";

export const useInfiniteRiderEarnings = (status: RiderEarningStatus | null) =>
  useInfiniteCursorPage(riderEarningsQueryKey(status), (cursor) =>
    riderPayApi.listEarnings(status, cursor),
  );
