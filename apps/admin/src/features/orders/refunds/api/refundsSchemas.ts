import {
  OrderRefundCause,
  OrderRefundMethod,
  OrderRefundStatus,
  RefundDestinationKind,
} from "@outfiqe/types";
import { z } from "zod";

import { paymentMethodSchema } from "../../api/ordersSchemas";

export const STAFF_REFUND_CAUSES = [
  OrderRefundCause.STAFF_ADJUSTMENT,
  OrderRefundCause.BRAND_UNAVAILABLE,
  OrderRefundCause.HUB_INSPECTION_FAILED,
  OrderRefundCause.CUSTOMER_REFUSED,
  OrderRefundCause.PARTNER_FAILED,
] as const;
export const staffRefundCauseSchema = z.enum(STAFF_REFUND_CAUSES);
export type StaffRefundCause = z.infer<typeof staffRefundCauseSchema>;

export const orderRefundSchema = z.object({
  id: z.string(),
  cause: z.enum(OrderRefundCause),
  reason: z.string(),
  status: z.enum(OrderRefundStatus),
  method: z.enum(OrderRefundMethod).nullable(),
  goodsAmount: z.number(),
  feeAmount: z.number(),
  totalAmount: z.number(),
  transferReference: z.string().nullable(),
  createdAt: z.string(),
  settledAt: z.string().nullable(),
  lines: z.array(
    z.object({
      orderItemId: z.string(),
      productName: z.string(),
      sizeLabel: z.string(),
      qty: z.number(),
      amount: z.number(),
    }),
  ),
});
export type OrderRefund = z.infer<typeof orderRefundSchema>;

export const orderRefundsResponseSchema = z.object({ refunds: z.array(orderRefundSchema) });

export const refundQueueItemSchema = orderRefundSchema.extend({
  orderId: z.string(),
  customerName: z.string(),
  customerPhone: z.string(),
  paymentMethod: paymentMethodSchema,
  destination: z
    .object({
      kind: z.enum(RefundDestinationKind),
      walletId: z.string().nullable(),
      bankName: z.string().nullable(),
      accountName: z.string(),
      accountNumberLast4: z.string().nullable(),
      updatedAt: z.string(),
    })
    .nullable(),
});
export type RefundQueueItem = z.infer<typeof refundQueueItemSchema>;

export const refundQueuePageSchema = z.object({
  items: z.array(refundQueueItemSchema),
  nextCursor: z.string().nullable(),
});
export type RefundQueuePage = z.infer<typeof refundQueuePageSchema>;

export const revealedAccountNumberSchema = z.object({ accountNumber: z.string() });

export type RefundOrderItemsBody = {
  lines: { orderItemId: string; qty: number }[];
  cause: StaffRefundCause;
  reason: string;
  restock: boolean;
};
