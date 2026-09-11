import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
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

const requireShopper = [requireAuth, requireRole(UserRole.CUSTOMER)];

export const cartRoutes = Router();

cartRoutes.get("/", ...requireShopper, cartController.get);

cartRoutes.post(
  "/items",
  ...requireShopper,
  validate({ body: addCartItemBodySchema }),
  cartController.addItem,
);

cartRoutes.patch(
  "/items/:cartItemId",
  ...requireShopper,
  validate({ params: cartItemIdParamSchema, body: updateCartItemBodySchema }),
  cartController.updateItem,
);

cartRoutes.delete(
  "/items/:cartItemId",
  ...requireShopper,
  validate({ params: cartItemIdParamSchema }),
  cartController.removeItem,
);

cartRoutes.patch(
  "/city",
  ...requireShopper,
  validate({ body: updateCartCityBodySchema }),
  cartController.updateCity,
);

cartRoutes.post(
  "/coupon",
  ...requireShopper,
  cartCouponApplyRateLimit,
  validate({ body: applyCartCouponSchema }),
  cartController.applyCoupon,
);

cartRoutes.delete("/coupon", ...requireShopper, cartController.removeCoupon);
