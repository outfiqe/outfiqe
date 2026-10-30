import { millisecondsInMinute } from "date-fns/constants";
import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { rateLimit } from "#middlewares/rate-limit.js";
import { requireActiveAuth } from "#middlewares/require-active-account.js";
import { getAuthPrincipal } from "#middlewares/require-auth.js";
import { requireIdempotencyKey } from "#middlewares/require-idempotency-key.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import { orderIdParamSchema } from "../order.schemas.js";
import { orderRefundController } from "./refund.controller.js";
import {
  cancelMyOrderLinesSchema,
  listRefundQueueQuerySchema,
  markManualRefundPaidSchema,
  refundIdParamSchema,
  staffRefundItemsSchema,
} from "./refund.schemas.js";
import { orderRefundDestinationController } from "./refund-destination.controller.js";
import { refundDestinationBodySchema } from "./refund-destination.schemas.js";

const STAFF_REFUND_WRITES_PER_MINUTE = 30;

const staffRefundWriteRateLimit = rateLimit({
  namespace: "order-refund-staff-write",
  windowMs: millisecondsInMinute,
  max: STAFF_REFUND_WRITES_PER_MINUTE,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many refund changes in a short time. Please wait a moment and try again.",
});

const ONE_HOUR_MS = 60 * millisecondsInMinute;
const CUSTOMER_REFUND_DETAIL_SAVES_PER_HOUR = 10;

const customerRefundDetailsRateLimit = rateLimit({
  namespace: "order-refund-details",
  windowMs: ONE_HOUR_MS,
  max: CUSTOMER_REFUND_DETAIL_SAVES_PER_HOUR,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many changes to your refund details. Please wait a while and try again.",
});

const CUSTOMER_LINE_CANCELLATIONS_PER_HOUR = 10;

const customerLineCancellationRateLimit = rateLimit({
  namespace: "order-line-cancel-mine",
  windowMs: ONE_HOUR_MS,
  max: CUSTOMER_LINE_CANCELLATIONS_PER_HOUR,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many cancellation attempts. Please wait a moment and try again.",
});

const requireShopper = [...requireActiveAuth, requireRole(UserRole.CUSTOMER)];

export const orderRefundRoutes = Router();

orderRefundRoutes.get(
  "/admin/refunds",
  ...platformGuards.ordersRead,
  validate({ query: listRefundQueueQuerySchema }),
  orderRefundController.listQueue,
);

orderRefundRoutes.post(
  "/admin/refunds/:refundId/mark-paid",
  ...platformGuards.ordersManage,
  staffRefundWriteRateLimit,
  validate({ params: refundIdParamSchema, body: markManualRefundPaidSchema }),
  orderRefundController.markPaid,
);

orderRefundRoutes.get(
  "/admin/:orderId/refunds",
  ...platformGuards.ordersRead,
  validate({ params: orderIdParamSchema }),
  orderRefundController.listForOrder,
);

orderRefundRoutes.post(
  "/admin/:orderId/refunds",
  ...platformGuards.ordersManage,
  staffRefundWriteRateLimit,
  requireIdempotencyKey,
  validate({ params: orderIdParamSchema, body: staffRefundItemsSchema }),
  orderRefundController.refundItems,
);

orderRefundRoutes.get(
  "/admin/refunds/:refundId/account-number",
  ...platformGuards.ordersManage,
  staffRefundWriteRateLimit,
  validate({ params: refundIdParamSchema }),
  orderRefundDestinationController.revealAccountNumber,
);

orderRefundRoutes.get(
  "/:orderId/refunds",
  ...requireShopper,
  validate({ params: orderIdParamSchema }),
  orderRefundController.listMine,
);

orderRefundRoutes.post(
  "/:orderId/line-cancellations",
  ...requireShopper,
  customerLineCancellationRateLimit,
  requireIdempotencyKey,
  validate({ params: orderIdParamSchema, body: cancelMyOrderLinesSchema }),
  orderRefundController.cancelMyLines,
);

orderRefundRoutes.get(
  "/:orderId/refund-destination",
  ...requireShopper,
  validate({ params: orderIdParamSchema }),
  orderRefundDestinationController.getMine,
);

orderRefundRoutes.put(
  "/:orderId/refund-destination",
  ...requireShopper,
  customerRefundDetailsRateLimit,
  validate({ params: orderIdParamSchema, body: refundDestinationBodySchema }),
  orderRefundDestinationController.saveMine,
);
