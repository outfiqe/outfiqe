import { Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { applyCartCouponSchema } from "#modules/coupons/coupon.schemas.js";

import { cartController } from "./cart.controller.js";
import {
  addCartItemBodySchema,
  cartItemIdParamSchema,
  updateCartCityBodySchema,
  updateCartItemBodySchema,
} from "./cart.schemas.js";

const COUPON_APPLY_WINDOW_MS = 5 * 60 * 1000;
const COUPON_APPLY_MAX_ATTEMPTS = 10;

const cartCouponApplyRateLimit = rateLimit({
  namespace: "cart-coupon-apply",
  windowMs: COUPON_APPLY_WINDOW_MS,
  max: COUPON_APPLY_MAX_ATTEMPTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many coupon attempts. Please wait a moment and try again.",
});

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
  cartCouponApplyRateLimit,
  validate({ body: applyCartCouponSchema }),
  cartController.applyCoupon,
);

cartRoutes.delete("/coupon", requireAuth, cartController.removeCoupon);
