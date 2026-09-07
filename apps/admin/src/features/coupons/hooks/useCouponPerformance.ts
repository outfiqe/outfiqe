import { useQuery } from "@tanstack/react-query";

import { couponsApi } from "../api";

export const useCouponPerformance = (couponId: string | null) => {
  return useQuery({
    queryKey: ["admin-coupon-performance", couponId],
    queryFn: () => couponsApi.getPerformance(couponId as string),
    enabled: couponId !== null,
  });
};
