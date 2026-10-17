import { z } from "zod";

export const UNAVAILABLE_ITEM_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export const unavailableItemStatusSchema = z.enum(UNAVAILABLE_ITEM_STATUSES);
export type UnavailableItemStatus = z.infer<typeof unavailableItemStatusSchema>;

export const unavailableItemRequestSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  fulfilmentGroupId: z.string(),
  orderItemId: z.string(),
  brandName: z.string(),
  productName: z.string(),
  sizeLabel: z.string(),
  unitPrice: z.number(),
  qty: z.number(),
  reason: z.string(),
  status: unavailableItemStatusSchema,
  decisionNote: z.string().nullable(),
  refundId: z.string().nullable(),
  createdAt: z.string(),
  decidedAt: z.string().nullable(),
});
export type UnavailableItemRequest = z.infer<typeof unavailableItemRequestSchema>;

export const unavailableItemPageSchema = z.object({
  items: z.array(unavailableItemRequestSchema),
  nextCursor: z.string().nullable(),
});
export type UnavailableItemPage = z.infer<typeof unavailableItemPageSchema>;
