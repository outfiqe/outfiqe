import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";

import { couponController } from "./coupon.controller.js";
import {
  couponIdParamSchema,
  createCouponSchema,
  listCouponsQuerySchema,
  updateCouponStatusSchema,
} from "./coupon.schemas.js";

const requireAdmin = [requireAuth, requirePlatformAccess];

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
  "/:id",
  ...requireAdmin,
  validate({ params: couponIdParamSchema }),
  couponController.getById,
);
couponRoutes.patch(
  "/:id/status",
  ...requireAdmin,
  validate({ params: couponIdParamSchema, body: updateCouponStatusSchema }),
  couponController.updateStatus,
);
