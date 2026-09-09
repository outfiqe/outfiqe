import { z } from "zod";

import { FulfilmentStatus, PaymentStatus } from "@/features/orders";

export const ORDER_FULFILMENT_SUMMARY = [
  "UNFULFILLED",
  "PARTIALLY_SHIPPED",
  "SHIPPED",
  "FULFILLED",
  "CANCELLED",
] as const;

export const orderFulfilmentSummarySchema = z.enum(ORDER_FULFILMENT_SUMMARY);
export type OrderFulfilmentSummary = z.infer<typeof orderFulfilmentSummarySchema>;

export const BRAND_PAYOUT_STATUS = ["PENDING", "AVAILABLE", "WITHDRAWN", "VOIDED"] as const;
export const brandPayoutStatusSchema = z.enum(BRAND_PAYOUT_STATUS);

export const brandShipmentSummarySchema = z.object({
  id: z.string(),
  orderId: z.string(),
  orderCreatedAt: z.string(),
  status: z.enum(FulfilmentStatus),
  carrier: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  shippedAt: z.string().nullable(),
  deliveredAt: z.string().nullable(),
  cancellationRequestedAt: z.string().nullable(),
  itemCount: z.number(),
  totalQty: z.number(),
  firstItemImageUrl: z.string().nullable(),
  firstItemProductName: z.string(),
  shipToCity: z.string(),
  orderPaymentStatus: z.enum(PaymentStatus),
  orderFulfilmentSummary: orderFulfilmentSummarySchema,
});
export type BrandShipmentSummary = z.infer<typeof brandShipmentSummarySchema>;

export const brandShipmentsPageSchema = z.object({
  items: z.array(brandShipmentSummarySchema),
  nextCursor: z.string().nullable(),
});
export type BrandShipmentsPage = z.infer<typeof brandShipmentsPageSchema>;

const brandShipmentItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  imageUrl: z.string().nullable(),
  sizeLabel: z.string(),
  qty: z.number(),
  unitPrice: z.number(),
  listUnitPrice: z.number(),
  brandDiscountAmount: z.number(),
  platformDiscountAmount: z.number(),
});

const brandShipmentPayoutLineSchema = z.object({
  orderItemId: z.string(),
  grossAmount: z.number(),
  platformFee: z.number(),
  gatewayFee: z.number(),
  netAmount: z.number(),
  status: brandPayoutStatusSchema,
});

const brandShipmentPayoutSchema = z.object({
  lines: z.array(brandShipmentPayoutLineSchema),
  grossAmount: z.number(),
  platformFee: z.number(),
  gatewayFee: z.number(),
  netAmount: z.number(),
});

export const brandShipmentDetailSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  orderCreatedAt: z.string(),
  status: z.enum(FulfilmentStatus),
  carrier: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  packedAt: z.string().nullable(),
  shippedAt: z.string().nullable(),
  deliveredAt: z.string().nullable(),
  cancellationRequestedAt: z.string().nullable(),
  cancellationReason: z.string().nullable(),
  items: z.array(brandShipmentItemSchema),
  shipTo: z.object({
    fullName: z.string(),
    phone: z.string(),
    address: z.string(),
    city: z.string(),
    landmark: z.string().nullable(),
  }),
  payout: brandShipmentPayoutSchema,
  shipToCity: z.string(),
  orderPaymentStatus: z.enum(PaymentStatus),
  orderFulfilmentSummary: orderFulfilmentSummarySchema,
});
export type BrandShipmentDetail = z.infer<typeof brandShipmentDetailSchema>;
export type BrandShipmentItem = z.infer<typeof brandShipmentItemSchema>;
