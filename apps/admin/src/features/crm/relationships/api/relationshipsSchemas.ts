import { z } from "zod";

export const relationshipListReasonSchema = z
  .literal("ORGANIZATION_NOT_LINKED_TO_BRAND")
  .nullable();

export const partnerSummarySchema = z.object({
  creatorId: z.string(),
  name: z.string(),
  handle: z.string(),
  avatarUrl: z.string().nullable(),
  tagClickCount: z.number(),
  attributedOrderCount: z.number(),
  attributedRevenue: z.number(),
  lastActivityAt: z.string().nullable(),
});
export type PartnerSummary = z.infer<typeof partnerSummarySchema>;

export const customerSummarySchema = z.object({
  userId: z.string(),
  name: z.string(),
  handle: z.string(),
  avatarUrl: z.string().nullable(),
  orderCount: z.number(),
  itemCount: z.number(),
  totalPaid: z.number(),
  firstOrderAt: z.string().nullable(),
  lastOrderAt: z.string().nullable(),
});
export type CustomerSummary = z.infer<typeof customerSummarySchema>;

const listPage = <TItem extends z.ZodTypeAny>(item: TItem) =>
  z.object({
    items: z.array(item),
    total: z.number(),
    hasMore: z.boolean(),
    reason: relationshipListReasonSchema,
  });

export const partnerListPageSchema = listPage(partnerSummarySchema);
export type PartnerListPage = z.infer<typeof partnerListPageSchema>;

export const customerListPageSchema = listPage(customerSummarySchema);
export type CustomerListPage = z.infer<typeof customerListPageSchema>;

export const partnerDetailSchema = partnerSummarySchema.extend({
  productBreakdown: z.array(
    z.object({
      productId: z.string(),
      productName: z.string(),
      tagClickCount: z.number(),
      attributedOrderCount: z.number(),
      attributedRevenue: z.number(),
    }),
  ),
  recentAttributedOrders: z.array(
    z.object({
      orderItemId: z.string(),
      orderId: z.string(),
      productName: z.string(),
      qty: z.number(),
      unitPrice: z.number(),
      paymentStatus: z.string(),
      fulfilmentStatus: z.string(),
      createdAt: z.string(),
    }),
  ),
});
export type PartnerDetail = z.infer<typeof partnerDetailSchema>;

export const customerDetailSchema = customerSummarySchema.extend({
  recentOrders: z.array(
    z.object({
      orderId: z.string(),
      itemCount: z.number(),
      brandSubtotal: z.number(),
      paymentStatus: z.string(),
      fulfilmentStatus: z.string(),
      createdAt: z.string(),
    }),
  ),
});
export type CustomerDetail = z.infer<typeof customerDetailSchema>;
