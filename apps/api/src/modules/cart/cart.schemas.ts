import { z } from "zod";

import { citySchema } from "#modules/delivery-zones/deliveryZone.schemas.js";

import { MAX_CART_ITEM_QTY } from "./cart.constants.js";

export const addCartItemBodySchema = z.object({
  productId: z.uuid(),
  sizeId: z.uuid(),
  qty: z.coerce.number().int().min(1).max(MAX_CART_ITEM_QTY).default(1),
});

export const updateCartItemBodySchema = z.object({
  qty: z.coerce.number().int().min(0).max(MAX_CART_ITEM_QTY),
});

export const cartItemIdParamSchema = z.object({
  cartItemId: z.uuid(),
});

export const updateCartCityBodySchema = z.object({ city: citySchema });

export type AddCartItemBody = z.infer<typeof addCartItemBodySchema>;
export type UpdateCartItemBody = z.infer<typeof updateCartItemBodySchema>;
export type CartItemIdParam = z.infer<typeof cartItemIdParamSchema>;
export type UpdateCartCityBody = z.infer<typeof updateCartCityBodySchema>;
