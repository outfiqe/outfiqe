import { z } from "zod";

import { SESSION_ID_MAX } from "#constants/commerce.constants.js";
import { FulfilmentStatus, PaymentMethod } from "#generated/prisma/enums.js";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 30;
const DEFAULT_LIST_PAGE_SIZE = 20;
const MAX_LIST_PAGE_SIZE = 50;
const REASON_MAX = 500;

export const checkoutBodySchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(6).max(20),
  address: z.string().trim().min(1).max(300),
  city: z.string().trim().min(1).max(120),
  landmark: z.string().trim().max(200).optional(),
  paymentMethod: z.enum(PaymentMethod),
  sessionId: z.string().trim().min(1).max(SESSION_ID_MAX).optional(),
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

const advanceableFulfilmentStatuses = [
  FulfilmentStatus.PACKED,
  FulfilmentStatus.SHIPPED,
  FulfilmentStatus.DELIVERED,
] satisfies FulfilmentStatus[];

export const advanceFulfilmentSchema = z.object({
  status: z.enum(advanceableFulfilmentStatuses),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(1).max(REASON_MAX),
});

export type CheckoutBody = z.infer<typeof checkoutBodySchema>;
export type OrderIdParam = z.infer<typeof orderIdParamSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type ListAdminOrdersQuery = z.infer<typeof listAdminOrdersQuerySchema>;
export type ListBrandOrdersQuery = z.infer<typeof listBrandOrdersQuerySchema>;
export type AdvanceFulfilmentBody = z.infer<typeof advanceFulfilmentSchema>;
export type CancelOrderBody = z.infer<typeof cancelOrderSchema>;
