import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { commissionsApi } from "../api";
import type { CommissionStatusValue } from "../schemas";

export const useInfiniteCommissions = (status: CommissionStatusValue) => {
  return useInfiniteCursorPage(["commissions", status], (cursor) =>
    commissionsApi.list(status, cursor),
  );
};
