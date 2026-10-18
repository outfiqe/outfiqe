import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { rateLimit } from "#middlewares/rate-limit.js";
import { requireActiveAuth } from "#middlewares/require-active-account.js";
import { getAuthPrincipal } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import { fulfilmentGroupIdParamSchema } from "../order.schemas.js";
import { orderUnavailableItemController } from "./unavailable-item.controller.js";
import {
  listUnavailableItemsQuerySchema,
  rejectUnavailableItemSchema,
  reportUnavailableItemsSchema,
  unavailableRequestIdParamSchema,
} from "./unavailable-item.schemas.js";

const ONE_MINUTE_MS = 60 * 1000;
const UNAVAILABLE_ITEM_WRITES_PER_MINUTE = 20;

const unavailableItemWriteRateLimit = rateLimit({
  namespace: "order-unavailable-items-write",
  windowMs: ONE_MINUTE_MS,
  max: UNAVAILABLE_ITEM_WRITES_PER_MINUTE,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many changes in a short time. Please wait a moment and try again.",
});

const requireBrandOwner = [...requireActiveAuth, requireRole(UserRole.BRAND_OWNER)];

export const orderUnavailableItemRoutes = Router();

orderUnavailableItemRoutes.get(
  "/admin/unavailable-items",
  ...platformGuards.ordersRead,
  validate({ query: listUnavailableItemsQuerySchema }),
  orderUnavailableItemController.listForStaff,
);

orderUnavailableItemRoutes.post(
  "/admin/unavailable-items/:requestId/approve",
  ...platformGuards.ordersManage,
  unavailableItemWriteRateLimit,
  validate({ params: unavailableRequestIdParamSchema }),
  orderUnavailableItemController.approve,
);

orderUnavailableItemRoutes.post(
  "/admin/unavailable-items/:requestId/reject",
  ...platformGuards.ordersManage,
  unavailableItemWriteRateLimit,
  validate({ params: unavailableRequestIdParamSchema, body: rejectUnavailableItemSchema }),
  orderUnavailableItemController.reject,
);

orderUnavailableItemRoutes.get(
  "/brand/fulfilment-groups/:groupId/unavailable-items",
  ...requireBrandOwner,
  validate({ params: fulfilmentGroupIdParamSchema }),
  orderUnavailableItemController.listMine,
);

orderUnavailableItemRoutes.post(
  "/brand/fulfilment-groups/:groupId/unavailable-items",
  ...requireBrandOwner,
  unavailableItemWriteRateLimit,
  validate({ params: fulfilmentGroupIdParamSchema, body: reportUnavailableItemsSchema }),
  orderUnavailableItemController.report,
);
