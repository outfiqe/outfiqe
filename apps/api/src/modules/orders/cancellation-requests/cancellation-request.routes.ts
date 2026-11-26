import { millisecondsInMinute } from "date-fns/constants";
import { Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import { orderCancellationRequestController } from "./cancellation-request.controller.js";
import {
  cancellationRequestGroupParamSchema,
  listCancellationRequestsQuerySchema,
  rejectCancellationRequestSchema,
} from "./cancellation-request.schemas.js";

const CANCELLATION_REQUEST_WRITES_PER_MINUTE = 20;

const cancellationRequestWriteRateLimit = rateLimit({
  namespace: "order-cancellation-requests-write",
  windowMs: millisecondsInMinute,
  max: CANCELLATION_REQUEST_WRITES_PER_MINUTE,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many changes in a short time. Please wait a moment and try again.",
});

export const orderCancellationRequestRoutes = Router();

orderCancellationRequestRoutes.get(
  "/admin/cancellation-requests",
  ...platformGuards.ordersRead,
  validate({ query: listCancellationRequestsQuerySchema }),
  orderCancellationRequestController.listForStaff,
);

orderCancellationRequestRoutes.post(
  "/admin/cancellation-requests/:groupId/approve",
  ...platformGuards.ordersManage,
  cancellationRequestWriteRateLimit,
  validate({ params: cancellationRequestGroupParamSchema }),
  orderCancellationRequestController.approve,
);

orderCancellationRequestRoutes.post(
  "/admin/cancellation-requests/:groupId/reject",
  ...platformGuards.ordersManage,
  cancellationRequestWriteRateLimit,
  validate({ params: cancellationRequestGroupParamSchema, body: rejectCancellationRequestSchema }),
  orderCancellationRequestController.reject,
);
