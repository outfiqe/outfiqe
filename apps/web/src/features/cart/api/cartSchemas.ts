import { z } from "zod";

export const cartItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  sizeId: z.string(),
  productName: z.string(),
  brandName: z.string(),
  imageUrl: z.string().nullable(),
  sizeLabel: z.string(),
  unitPrice: z.number(),
  listUnitPrice: z.number(),
  discountPercent: z.number().nullable(),
  qty: z.number(),
  availableStock: z.number(),
  soldOut: z.boolean(),
  lowStock: z.boolean(),
});
export type CartItem = z.infer<typeof cartItemSchema>;

export const appliedCouponSchema = z.object({
  code: z.string(),
  discountAmount: z.number(),
});
export type AppliedCoupon = z.infer<typeof appliedCouponSchema>;

export const cartSchema = z.object({
  items: z.array(cartItemSchema),
  itemCount: z.number(),
  subtotal: z.number(),
  deliveryFee: z.number(),
  platformDiscountTotal: z.number(),
  total: z.number(),
  city: z.string().nullable(),
  appliedCoupon: appliedCouponSchema.nullable(),
});
export type Cart = z.infer<typeof cartSchema>;
