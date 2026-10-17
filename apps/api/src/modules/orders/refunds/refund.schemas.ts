import { z } from "zod";

import { OrderRefundCause, OrderRefundStatus } from "#generated/prisma/enums.js";

import {
  MAX_REFUND_LINES,
  MAX_REFUND_REASON_LENGTH,
  MIN_REFUND_REASON_LENGTH,
} from "./refund.constants.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MIN_TRANSFER_REFERENCE_LENGTH = 3;
const MAX_TRANSFER_REFERENCE_LENGTH = 120;

const hasOneLinePerItem = (lines: readonly { orderItemId: string }[]) =>
  new Set(lines.map((line) => line.orderItemId)).size === lines.length;

const STAFF_REFUND_CAUSES = [
  OrderRefundCause.STAFF_ADJUSTMENT,
  OrderRefundCause.BRAND_UNAVAILABLE,
  OrderRefundCause.HUB_INSPECTION_FAILED,
  OrderRefundCause.CUSTOMER_REFUSED,
  OrderRefundCause.PARTNER_FAILED,
] as const;

export const refundReasonSchema = z
  .string()
  .trim()
  .min(MIN_REFUND_REASON_LENGTH)
  .max(MAX_REFUND_REASON_LENGTH);

export const refundLinesSchema = z
  .array(z.object({ orderItemId: z.uuid(), qty: z.number().int().min(1) }))
  .min(1)
  .max(MAX_REFUND_LINES)
  .refine(hasOneLinePerItem, "List each item only once.");

export const staffRefundItemsSchema = z.object({
  lines: refundLinesSchema,
  cause: z.enum(STAFF_REFUND_CAUSES),
  reason: refundReasonSchema,
  restock: z.boolean().default(false),
});

export const cancelMyOrderLinesSchema = z.object({
  lines: refundLinesSchema,
  reason: refundReasonSchema.optional(),
});

export const refundIdParamSchema = z.object({ refundId: z.uuid() });

export const markManualRefundPaidSchema = z.object({
  transferReference: z
    .string()
    .trim()
    .min(MIN_TRANSFER_REFERENCE_LENGTH)
    .max(MAX_TRANSFER_REFERENCE_LENGTH),
});

export const listRefundQueueQuerySchema = z.object({
  status: z.enum(OrderRefundStatus).default(OrderRefundStatus.NEEDS_MANUAL),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type StaffRefundItemsBody = z.infer<typeof staffRefundItemsSchema>;
export type RefundIdParam = z.infer<typeof refundIdParamSchema>;
export type CancelMyOrderLinesBody = z.infer<typeof cancelMyOrderLinesSchema>;
export type MarkManualRefundPaidBody = z.infer<typeof markManualRefundPaidSchema>;
export type ListRefundQueueQuery = z.infer<typeof listRefundQueueQuerySchema>;
