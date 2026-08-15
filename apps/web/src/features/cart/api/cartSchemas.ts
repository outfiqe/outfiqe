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
  qty: z.number(),
  availableStock: z.number(),
  soldOut: z.boolean(),
  lowStock: z.boolean(),
});
export type CartItem = z.infer<typeof cartItemSchema>;

export const cartSchema = z.object({
  items: z.array(cartItemSchema),
  itemCount: z.number(),
  subtotal: z.number(),
  deliveryFee: z.number(),
  total: z.number(),
});
export type Cart = z.infer<typeof cartSchema>;
