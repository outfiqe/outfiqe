import { useInfiniteCursorPage } from "@outfiqe/hooks";

import type { RedemptionSearchFilters } from "../api/couponsApi";
import { couponsApi } from "../api/couponsApi";

export const useInfiniteRedemptions = (filters: RedemptionSearchFilters, enabled: boolean) => {
  return useInfiniteCursorPage(
    ["admin-coupon-redemptions", filters],
    (cursor) => couponsApi.searchRedemptions({ ...filters, cursor }),
    enabled,
  );
};
