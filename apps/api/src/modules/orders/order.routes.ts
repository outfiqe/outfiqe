import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";

import { orderController } from "./order.controller.js";
import {
  advanceFulfilmentSchema,
  cancelMyOrderSchema,
  cancelOrderSchema,
  checkoutBodySchema,
  listAdminOrdersQuerySchema,
  listBrandOrdersQuerySchema,
  listOrdersQuerySchema,
  orderIdParamSchema,
} from "./order.schemas.js";

const CHECKOUT_WINDOW_MS = 5 * 60 * 1000;
const CHECKOUT_MAX_REQUESTS = 10;

const checkoutRateLimit = rateLimit({
  namespace: "checkout",
  windowMs: CHECKOUT_WINDOW_MS,
  max: CHECKOUT_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many checkout attempts. Please wait a moment and try again.",
});

const CANCEL_WINDOW_MS = 60 * 60 * 1000;
const CANCEL_MAX_REQUESTS = 10;

const cancelMyOrderRateLimit = rateLimit({
  namespace: "order-cancel-mine",
  windowMs: CANCEL_WINDOW_MS,
  max: CANCEL_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many cancellation attempts. Please wait a moment and try again.",
});

const requireAdmin = [requireAuth, requireRole(UserRole.ADMIN)];
const requireBrandOwner = [requireAuth, requireRole(UserRole.BRAND_OWNER)];

export const orderRoutes = Router();

/*
  Static/prefixed paths first — Express would otherwise never reach them once the
  "/:orderId"-shaped route below matched the same segment.
 */
orderRoutes.get(
  "/admin",
  ...requireAdmin,
  validate({ query: listAdminOrdersQuerySchema }),
  orderController.listAllAdmin,
);

orderRoutes.get(
  "/admin/:orderId",
  ...requireAdmin,
  validate({ params: orderIdParamSchema }),
  orderController.getAdmin,
);

orderRoutes.patch(
  "/admin/:orderId/fulfilment",
  ...requireAdmin,
  validate({ params: orderIdParamSchema, body: advanceFulfilmentSchema }),
  orderController.advanceFulfilment,
);

orderRoutes.post(
  "/admin/:orderId/cancel",
  ...requireAdmin,
  validate({ params: orderIdParamSchema, body: cancelOrderSchema }),
  orderController.cancel,
);

orderRoutes.get(
  "/brand",
  ...requireBrandOwner,
  validate({ query: listBrandOrdersQuerySchema }),
  orderController.listMineAsBrand,
);

orderRoutes.post(
  "/checkout",
  requireAuth,
  checkoutRateLimit,
  validate({ body: checkoutBodySchema }),
  orderController.checkout,
);

orderRoutes.get("/", requireAuth, validate({ query: listOrdersQuerySchema }), orderController.list);

orderRoutes.get(
  "/:orderId",
  requireAuth,
  validate({ params: orderIdParamSchema }),
  orderController.get,
);

orderRoutes.post(
  "/:orderId/cancel",
  requireAuth,
  cancelMyOrderRateLimit,
  validate({ params: orderIdParamSchema, body: cancelMyOrderSchema }),
  orderController.cancelMine,
);
