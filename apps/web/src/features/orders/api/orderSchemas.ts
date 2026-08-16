import type {
  FulfilmentStatus as FulfilmentStatusType,
  PaymentMethod as PaymentMethodType,
  PaymentStatus as PaymentStatusType,
  PaymentTransactionStatus as PaymentTransactionStatusType,
  PaymentTransactionType as PaymentTransactionTypeType,
} from "@outfiqe/types";
import { z } from "zod";

export const PaymentMethod = {
  COD: "COD",
  ESEWA: "ESEWA",
  KHALTI: "KHALTI",
} as const satisfies Record<string, PaymentMethodType>;
export type PaymentMethodValue = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const PaymentStatus = {
  INITIATED: "INITIATED",
  PAID: "PAID",
  DUE: "DUE",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const satisfies Record<string, PaymentStatusType>;
export type PaymentStatusValue = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const FulfilmentStatus = {
  PLACED: "PLACED",
  PACKED: "PACKED",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
} as const satisfies Record<string, FulfilmentStatusType>;
export type FulfilmentStatusValue = (typeof FulfilmentStatus)[keyof typeof FulfilmentStatus];

export const PaymentTransactionType = {
  PAYMENT: "PAYMENT",
  REFUND: "REFUND",
} as const satisfies Record<string, PaymentTransactionTypeType>;

export const PaymentTransactionStatus = {
  INITIATED: "INITIATED",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
} as const satisfies Record<string, PaymentTransactionStatusType>;

export const paymentMethodSchema = z.enum(PaymentMethod);
const paymentStatusSchema = z.enum(PaymentStatus);
const fulfilmentStatusSchema = z.enum(FulfilmentStatus);

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
  type: z.enum(PaymentTransactionType),
  status: z.enum(PaymentTransactionStatus),
  transactionRef: z.string().nullable(),
  createdAt: z.string(),
});
export type PaymentTransaction = z.infer<typeof paymentTransactionSchema>;

export const orderSchema = z.object({
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
});
export type Order = z.infer<typeof orderSchema>;

export const orderSummarySchema = orderSchema
  .omit({ items: true, transactions: true, phone: true, address: true, city: true, landmark: true })
  .extend({
    itemCount: z.number(),
    firstItemImageUrl: z.string().nullable(),
    firstItemProductName: z.string(),
  });
export type OrderSummary = z.infer<typeof orderSummarySchema>;

export const orderListPageSchema = z.object({
  orders: z.array(orderSummarySchema),
  nextCursor: z.string().nullable(),
});
export type OrderListPage = z.infer<typeof orderListPageSchema>;
