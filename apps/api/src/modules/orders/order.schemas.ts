import { z } from "zod";

import { SESSION_ID_MAX } from "#constants/commerce.constants.js";
import { FulfilmentStatus, PaymentMethod } from "#generated/prisma/enums.js";
import { shippingAddressFields } from "#lib/shipping-address.schemas.js";
import { COUPON_CODE_MAX_LENGTH } from "#modules/coupons/coupon.constants.js";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 30;
const DEFAULT_LIST_PAGE_SIZE = 20;
const MAX_LIST_PAGE_SIZE = 50;
const REASON_MAX = 500;

export const buyNowLineSchema = z.object({
  productId: z.uuid(),
  sizeId: z.uuid(),
  qty: z.number().int().min(1),
});

export const checkoutBodySchema = z.object({
  ...shippingAddressFields,
  paymentMethod: z.enum(PaymentMethod),
  sessionId: z.string().trim().min(1).max(SESSION_ID_MAX).optional(),
  buyNow: buyNowLineSchema.optional(),
  couponCode: z.string().trim().min(1).max(COUPON_CODE_MAX_LENGTH).optional(),
});

export const orderIdParamSchema = z.object({
  orderId: z.uuid(),
});

export const listOrdersQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const listAdminOrdersQuerySchema = z.object({
  status: z.enum(FulfilmentStatus).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIST_PAGE_SIZE).default(DEFAULT_LIST_PAGE_SIZE),
});

export const listBrandOrdersQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIST_PAGE_SIZE).default(DEFAULT_LIST_PAGE_SIZE),
});

const CARRIER_MAX = 80;
const TRACKING_NUMBER_MAX = 120;

const brandFulfilmentGroupStatusFilters = [
  FulfilmentStatus.PLACED,
  FulfilmentStatus.PACKED,
  FulfilmentStatus.SHIPPED,
  FulfilmentStatus.DELIVERED,
  FulfilmentStatus.CANCELLED,
] satisfies FulfilmentStatus[];

export const listBrandFulfilmentGroupsQuerySchema = z.object({
  status: z.enum(brandFulfilmentGroupStatusFilters).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIST_PAGE_SIZE).default(DEFAULT_LIST_PAGE_SIZE),
});

export const fulfilmentGroupIdParamSchema = z.object({
  groupId: z.uuid(),
});

const advanceableFulfilmentStatuses = [
  FulfilmentStatus.PACKED,
  FulfilmentStatus.SHIPPED,
  FulfilmentStatus.DELIVERED,
] satisfies FulfilmentStatus[];

export const advanceFulfilmentSchema = z.object({
  status: z.enum(advanceableFulfilmentStatuses),
});

export const advanceBrandFulfilmentGroupSchema = z
  .object({
    status: z.enum(advanceableFulfilmentStatuses),
    carrier: z.string().trim().min(1).max(CARRIER_MAX).optional(),
    trackingNumber: z.string().trim().min(1).max(TRACKING_NUMBER_MAX).optional(),
  })
  .refine(
    (body) =>
      body.status !== FulfilmentStatus.SHIPPED ||
      (Boolean(body.carrier) && Boolean(body.trackingNumber)),
    { message: "A carrier and tracking number are required to mark a shipment as shipped." },
  );

export const requestGroupCancellationSchema = z.object({
  reason: z.string().trim().min(1).max(REASON_MAX),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(1).max(REASON_MAX),
});

export const cancelMyOrderSchema = z.object({
  reason: z.string().trim().min(1).max(REASON_MAX).optional(),
});

export type CheckoutBody = z.infer<typeof checkoutBodySchema>;
export type OrderIdParam = z.infer<typeof orderIdParamSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type ListAdminOrdersQuery = z.infer<typeof listAdminOrdersQuerySchema>;
export type ListBrandOrdersQuery = z.infer<typeof listBrandOrdersQuerySchema>;
export type ListBrandFulfilmentGroupsQuery = z.infer<typeof listBrandFulfilmentGroupsQuerySchema>;
export type FulfilmentGroupIdParam = z.infer<typeof fulfilmentGroupIdParamSchema>;
export type AdvanceFulfilmentBody = z.infer<typeof advanceFulfilmentSchema>;
export type AdvanceBrandFulfilmentGroupBody = z.infer<typeof advanceBrandFulfilmentGroupSchema>;
export type RequestGroupCancellationBody = z.infer<typeof requestGroupCancellationSchema>;
export type CancelOrderBody = z.infer<typeof cancelOrderSchema>;
export type CancelMyOrderBody = z.infer<typeof cancelMyOrderSchema>;
