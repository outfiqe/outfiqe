import {
  OrderRefundCause,
  OrderRefundMethod,
  OrderRefundStatus,
  RefundDestinationKind,
} from "@outfiqe/types";
import { z } from "zod";

export const orderRefundSchema = z.object({
  id: z.string(),
  cause: z.enum(OrderRefundCause),
  reason: z.string(),
  status: z.enum(OrderRefundStatus),
  method: z.enum(OrderRefundMethod).nullable(),
  goodsAmount: z.number(),
  feeAmount: z.number(),
  totalAmount: z.number(),
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

export const refundDestinationSchema = z.object({
  kind: z.enum(RefundDestinationKind),
  walletId: z.string().nullable(),
  bankId: z.string().nullable(),
  bankName: z.string().nullable(),
  accountName: z.string(),
  accountNumberLast4: z.string().nullable(),
  updatedAt: z.string(),
});
export type RefundDestination = z.infer<typeof refundDestinationSchema>;

export const myRefundDestinationSchema = z.object({
  amountAwaitingDetails: z.number(),
  canEdit: z.boolean(),
  suggestedKind: z.enum(RefundDestinationKind).nullable(),
  suggestedWalletId: z.string(),
  suggestedAccountName: z.string(),
  destination: refundDestinationSchema.nullable(),
});
export type MyRefundDestination = z.infer<typeof myRefundDestinationSchema>;

export type SaveRefundDestinationBody =
  | {
      kind: typeof RefundDestinationKind.KHALTI | typeof RefundDestinationKind.ESEWA;
      walletId: string;
      accountName: string;
      confirmsOwnership: true;
    }
  | {
      kind: typeof RefundDestinationKind.BANK;
      bankId: string;
      accountNumber: string;
      accountName: string;
      confirmsOwnership: true;
    };

export type CancelOrderItemsBody = {
  lines: { orderItemId: string; qty: number }[];
  reason?: string;
};
