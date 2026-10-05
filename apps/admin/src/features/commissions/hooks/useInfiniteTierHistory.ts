import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { commissionsApi } from "../api";
import { commissionQueryKeys } from "../commissionQueryKeys";
import type { CommissionScopeValue } from "../schemas";

export const useInfiniteTierHistory = (scope: CommissionScopeValue) => {
  return useInfiniteCursorPage(commissionQueryKeys.tierHistory(scope), (cursor) =>
    commissionsApi.listTierHistory(scope, cursor),
  );
};
