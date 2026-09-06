import { useInfiniteCursorPage } from "@outfiqe/hooks";

import { couponsApi } from "../api";
import type { CouponStatusValue } from "../schemas";

export const useInfiniteCoupons = (status: CouponStatusValue) => {
  return useInfiniteCursorPage(["admin-coupons", status], (cursor) =>
    couponsApi.list(status, cursor),
  );
};
