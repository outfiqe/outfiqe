import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { couponsApi } from "../api/couponsApi";
import type { CouponStatusValue } from "../api/couponsSchemas";

export const useInfiniteCoupons = (status: CouponStatusValue) => {
  return useInfiniteCursorPage(["admin-coupons", status], (cursor) =>
    couponsApi.list(status, cursor),
  );
};
