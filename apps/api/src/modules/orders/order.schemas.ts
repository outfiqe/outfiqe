import { z } from "zod";

import { PaymentMethod } from "#generated/prisma/enums.js";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 30;

export const checkoutBodySchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(6).max(20),
  address: z.string().trim().min(1).max(300),
  city: z.string().trim().min(1).max(120),
  landmark: z.string().trim().max(200).optional(),
  paymentMethod: z.enum(PaymentMethod),
});

export const orderIdParamSchema = z.object({
  orderId: z.uuid(),
});

export const listOrdersQuerySchema = z.object({
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type CheckoutBody = z.infer<typeof checkoutBodySchema>;
export type OrderIdParam = z.infer<typeof orderIdParamSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
