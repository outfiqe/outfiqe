import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { commissionsApi } from "../api/commissionsApi";
import type { CommissionStatusValue } from "../api/commissionsSchemas";

export const useInfiniteCommissions = (status: CommissionStatusValue) => {
  return useInfiniteCursorPage(["commissions", status], (cursor) =>
    commissionsApi.list(status, cursor),
  );
};
