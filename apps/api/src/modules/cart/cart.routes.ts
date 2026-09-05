import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { applyCartCouponSchema } from "#modules/coupons/coupon.schemas.js";

import { cartController } from "./cart.controller.js";
import {
  addCartItemBodySchema,
  cartItemIdParamSchema,
  updateCartCityBodySchema,
  updateCartItemBodySchema,
} from "./cart.schemas.js";

export const cartRoutes = Router();

cartRoutes.get("/", requireAuth, cartController.get);

cartRoutes.post(
  "/items",
  requireAuth,
  validate({ body: addCartItemBodySchema }),
  cartController.addItem,
);

cartRoutes.patch(
  "/items/:cartItemId",
  requireAuth,
  validate({ params: cartItemIdParamSchema, body: updateCartItemBodySchema }),
  cartController.updateItem,
);

cartRoutes.delete(
  "/items/:cartItemId",
  requireAuth,
  validate({ params: cartItemIdParamSchema }),
  cartController.removeItem,
);

cartRoutes.patch(
  "/city",
  requireAuth,
  validate({ body: updateCartCityBodySchema }),
  cartController.updateCity,
);

cartRoutes.post(
  "/coupon",
  requireAuth,
  validate({ body: applyCartCouponSchema }),
  cartController.applyCoupon,
);

cartRoutes.delete("/coupon", requireAuth, cartController.removeCoupon);
