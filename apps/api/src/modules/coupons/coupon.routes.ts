import { Router } from "express";

import { validate } from "#middlewares/validate.js";
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

const requireCouponRead = [
  ...requirePlatformRole("platform:coupons:read", "platform:coupons:manage"),
  requirePlatformNavItem("coupons"),
];
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
  ...requireCouponRead,
  validate({ query: listCouponsQuerySchema }),
  couponController.list,
);
couponRoutes.get(
  "/redemptions",
  ...requireCouponRead,
  validate({ query: redemptionSearchQuerySchema }),
  couponController.searchRedemptions,
);
couponRoutes.get(
  "/:id",
  ...requireCouponRead,
  validate({ params: couponIdParamSchema }),
  couponController.getById,
);
couponRoutes.get(
  "/:id/performance",
  ...requireCouponRead,
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
