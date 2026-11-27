import { z } from "zod";

export const cancellationRequestItemSchema = z.object({
  orderItemId: z.string(),
  productName: z.string(),
  sizeLabel: z.string(),
  unitPrice: z.number(),
  qty: z.number(),
  refundedQty: z.number(),
});
export type CancellationRequestItem = z.infer<typeof cancellationRequestItemSchema>;

export const cancellationRequestSchema = z.object({
  fulfilmentGroupId: z.string(),
  orderId: z.string(),
  brandName: z.string(),
  groupStatus: z.string(),
  reason: z.string(),
  requestedAt: z.string(),
  remainingAmount: z.number(),
  items: z.array(cancellationRequestItemSchema),
});
export type CancellationRequest = z.infer<typeof cancellationRequestSchema>;

export const cancellationRequestPageSchema = z.object({
  items: z.array(cancellationRequestSchema),
  nextCursor: z.string().nullable(),
});
export type CancellationRequestPage = z.infer<typeof cancellationRequestPageSchema>;

export const cancellationDecisionSchema = z.object({
  fulfilmentGroupId: z.string(),
  orderId: z.string(),
  decision: z.enum(["APPROVED", "REJECTED"]),
});
export type CancellationDecision = z.infer<typeof cancellationDecisionSchema>;
