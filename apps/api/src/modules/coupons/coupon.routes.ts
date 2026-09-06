import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";
import { requirePlatformNavItem } from "#modules/platform-nav-access/platform-nav-access.middleware.js";

import { couponController } from "./coupon.controller.js";
import {
  couponIdParamSchema,
  createCouponSchema,
  listCouponsQuerySchema,
  redemptionSearchQuerySchema,
  updateCouponBudgetSchema,
  updateCouponStatusSchema,
} from "./coupon.schemas.js";

const requireAdmin = [requireAuth, requirePlatformAccess, requirePlatformNavItem("coupons")];

export const couponRoutes = Router();

couponRoutes.post(
  "/",
  ...requireAdmin,
  validate({ body: createCouponSchema }),
  couponController.create,
);
couponRoutes.get(
  "/",
  ...requireAdmin,
  validate({ query: listCouponsQuerySchema }),
  couponController.list,
);
couponRoutes.get(
  "/redemptions",
  ...requireAdmin,
  validate({ query: redemptionSearchQuerySchema }),
  couponController.searchRedemptions,
);
couponRoutes.get(
  "/:id",
  ...requireAdmin,
  validate({ params: couponIdParamSchema }),
  couponController.getById,
);
couponRoutes.get(
  "/:id/performance",
  ...requireAdmin,
  validate({ params: couponIdParamSchema }),
  couponController.getPerformance,
);
couponRoutes.patch(
  "/:id/status",
  ...requireAdmin,
  validate({ params: couponIdParamSchema, body: updateCouponStatusSchema }),
  couponController.updateStatus,
);
couponRoutes.patch(
  "/:id/budget",
  ...requireAdmin,
  validate({ params: couponIdParamSchema, body: updateCouponBudgetSchema }),
  couponController.updateBudget,
);
couponRoutes.patch(
  "/:id/approve",
  ...requireAdmin,
  validate({ params: couponIdParamSchema }),
  couponController.approve,
);
