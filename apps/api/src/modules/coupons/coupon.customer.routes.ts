import { Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import { couponController } from "./coupon.controller.js";
import { previewBuyNowCouponSchema } from "./coupon.schemas.js";

const PREVIEW_WINDOW_MS = 5 * 60 * 1000;
const PREVIEW_MAX_ATTEMPTS = 10;

const previewBuyNowRateLimit = rateLimit({
  namespace: "coupon-preview-buy-now",
  windowMs: PREVIEW_WINDOW_MS,
  max: PREVIEW_MAX_ATTEMPTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many coupon attempts. Please wait a moment and try again.",
});

export const couponCustomerRoutes = Router();

couponCustomerRoutes.post(
  "/preview-buy-now",
  requireAuth,
  previewBuyNowRateLimit,
  validate({ body: previewBuyNowCouponSchema }),
  couponController.previewBuyNow,
);
