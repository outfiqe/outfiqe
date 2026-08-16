import type { FulfilmentStatus, PaymentMethod, PaymentStatus } from "@outfiqe/types";
import { z } from "zod";

const fulfilmentStatusValues = [
  "PLACED",
  "PACKED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
] satisfies FulfilmentStatus[];
export const fulfilmentStatusSchema = z.enum(fulfilmentStatusValues);
export type FulfilmentStatusValue = z.infer<typeof fulfilmentStatusSchema>;

const paymentMethodValues = ["COD", "ESEWA", "KHALTI"] satisfies PaymentMethod[];
export const paymentMethodSchema = z.enum(paymentMethodValues);
export type PaymentMethodValue = z.infer<typeof paymentMethodSchema>;

const paymentStatusValues = [
  "INITIATED",
  "PAID",
  "DUE",
  "FAILED",
  "REFUNDED",
] satisfies PaymentStatus[];
export const paymentStatusSchema = z.enum(paymentStatusValues);
export type PaymentStatusValue = z.infer<typeof paymentStatusSchema>;

export const orderItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  brandName: z.string(),
  imageUrl: z.string().nullable(),
  sizeLabel: z.string(),
  qty: z.number(),
  unitPrice: z.number(),
  attributedCreatorName: z.string().nullable(),
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const paymentTransactionSchema = z.object({
  id: z.string(),
  provider: paymentMethodSchema,
  type: z.enum(["PAYMENT", "REFUND"]),
  status: z.enum(["INITIATED", "SUCCEEDED", "FAILED", "CANCELLED"]),
  transactionRef: z.string().nullable(),
  createdAt: z.string(),
});
export type PaymentTransaction = z.infer<typeof paymentTransactionSchema>;

export const adminOrderSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  fullName: z.string(),
  phone: z.string(),
  address: z.string(),
  city: z.string(),
  landmark: z.string().nullable(),
  paymentMethod: paymentMethodSchema,
  paymentStatus: paymentStatusSchema,
  fulfilmentStatus: fulfilmentStatusSchema,
  subtotal: z.number(),
  deliveryFee: z.number(),
  codFee: z.number(),
  total: z.number(),
  items: z.array(orderItemSchema),
  transactions: z.array(paymentTransactionSchema),
  buyerName: z.string(),
  buyerEmail: z.string(),
  needsManualRefund: z.boolean(),
});
export type AdminOrder = z.infer<typeof adminOrderSchema>;

export const adminOrderSummarySchema = adminOrderSchema
  .omit({ items: true, transactions: true, phone: true, address: true, city: true, landmark: true })
  .extend({
    itemCount: z.number(),
    firstItemImageUrl: z.string().nullable(),
    firstItemProductName: z.string(),
  });
export type AdminOrderSummary = z.infer<typeof adminOrderSummarySchema>;
