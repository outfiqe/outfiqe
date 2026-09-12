import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";
import { requirePlatformRole } from "#modules/platform-access/platform-access.middleware.js";
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
const requireCouponMutationAdmin = [
  ...requirePlatformRole("platform:coupons:manage"),
  requirePlatformNavItem("coupons"),
];

export const couponRoutes = Router();

couponRoutes.post(
  "/",
  ...requireCouponMutationAdmin,
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
  ...requireCouponMutationAdmin,
  validate({ params: couponIdParamSchema, body: updateCouponStatusSchema }),
  couponController.updateStatus,
);
couponRoutes.patch(
  "/:id/budget",
  ...requireCouponMutationAdmin,
  validate({ params: couponIdParamSchema, body: updateCouponBudgetSchema }),
  couponController.updateBudget,
);
couponRoutes.patch(
  "/:id/approve",
  ...requireCouponMutationAdmin,
  validate({ params: couponIdParamSchema }),
  couponController.approve,
);
