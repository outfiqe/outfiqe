import { z } from "zod";

import type { Order } from "@/features/orders";
import { orderSchema } from "@/features/orders";
import { apiClient } from "@/shared/lib/apiClient";
import { getSessionId } from "@/shared/lib/sessionId";

import type { BuyNowLine, CheckoutInput } from "./checkoutSchemas";

const IDEMPOTENCY_HEADER = "Idempotency-Key";

const buyNowCouponPreviewSchema = z.object({
  code: z.string(),
  discountAmount: z.number(),
  prepaidOnly: z.boolean(),
});
export type BuyNowCouponPreview = z.infer<typeof buyNowCouponPreviewSchema>;

export const checkoutApi = {
  async submit(
    input: CheckoutInput,
    idempotencyKey: string,
    buyNow?: BuyNowLine,
    couponCode?: string,
  ): Promise<Order> {
    const res = await apiClient.post<Order>(
      "/orders/checkout",
      { ...input, sessionId: getSessionId(), buyNow, couponCode },
      { headers: { [IDEMPOTENCY_HEADER]: idempotencyKey } },
    );
    return orderSchema.parse(res.data);
  },

  async previewBuyNowCoupon(code: string, line: BuyNowLine): Promise<BuyNowCouponPreview> {
    const res = await apiClient.post<BuyNowCouponPreview>("/coupons/preview-buy-now", {
      code,
      ...line,
    });
    return buyNowCouponPreviewSchema.parse(res.data);
  },
};
