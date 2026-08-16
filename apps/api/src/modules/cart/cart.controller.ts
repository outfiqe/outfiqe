import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  AddCartItemBody,
  CartItemIdParam,
  UpdateCartCityBody,
  UpdateCartItemBody,
} from "./cart.schemas.js";
import { cartService } from "./cart.service.js";

export const cartController = {
  async get(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const cart = await cartService.getCart(userId);
    sendSuccess(res, cart, "Your bag.");
  },

  async addItem(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { productId, sizeId, qty } = validated.body<AddCartItemBody>(res);

    const cart = await cartService.addItem(userId, productId, sizeId, qty);
    sendSuccess(res, cart, "Added to bag.");
  },

  async updateItem(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { cartItemId } = validated.params<CartItemIdParam>(res);
    const { qty } = validated.body<UpdateCartItemBody>(res);

    const cart = await cartService.updateItemQty(userId, cartItemId, qty);
    sendSuccess(res, cart, "Bag updated.");
  },

  async removeItem(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { cartItemId } = validated.params<CartItemIdParam>(res);

    const cart = await cartService.removeItem(userId, cartItemId);
    sendSuccess(res, cart, "Removed from bag.");
  },

  async updateCity(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { city } = validated.body<UpdateCartCityBody>(res);

    const cart = await cartService.setCity(userId, city);
    sendSuccess(res, cart, "Delivery city updated.");
  },
};
