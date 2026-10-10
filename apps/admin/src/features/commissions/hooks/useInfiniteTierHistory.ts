import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { commissionsApi } from "../api/commissionsApi";
import type { CommissionScopeValue } from "../api/commissionsSchemas";
import { commissionQueryKeys } from "../constants/commissionQueryKeys";

export const useInfiniteTierHistory = (scope: CommissionScopeValue) => {
  return useInfiniteCursorPage(commissionQueryKeys.tierHistory(scope), (cursor) =>
    commissionsApi.listTierHistory(scope, cursor),
  );
};
