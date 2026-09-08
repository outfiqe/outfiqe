import { z } from "zod";

import { FulfilmentStatus, PaymentStatus } from "@/features/orders";

export const brandOrderItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  imageUrl: z.string().nullable(),
  sizeLabel: z.string(),
  qty: z.number(),
  unitPrice: z.number(),
  orderId: z.string(),
  orderCreatedAt: z.string(),
  paymentStatus: z.enum(PaymentStatus),
  fulfilmentStatus: z.enum(FulfilmentStatus),
});
export type BrandOrderItem = z.infer<typeof brandOrderItemSchema>;

export const brandOrdersPageSchema = z.object({
  items: z.array(brandOrderItemSchema),
  nextCursor: z.string().nullable(),
});
export type BrandOrdersPage = z.infer<typeof brandOrdersPageSchema>;
