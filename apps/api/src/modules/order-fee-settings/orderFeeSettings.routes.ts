import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { cache, refreshCacheOnWrite } from "#middlewares/cache.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";
import { CACHE_TTL } from "#redis/redis.keys.js";

import { orderFeeSettingsController } from "./orderFeeSettings.controller.js";
import {
  listOrderFeeSettingsHistoryQuerySchema,
  updateOrderFeeSettingsSchema,
} from "./orderFeeSettings.schemas.js";
import { orderFeeSettingsService } from "./orderFeeSettings.service.js";

const requireAdmin = [requireAuth, requireRole(UserRole.ADMIN)];

const CACHE_NAMESPACE = "order-fee-settings";

const orderFeeSettingsPublicCache = cache({
  namespace: CACHE_NAMESPACE,
  ttlSeconds: CACHE_TTL.ORDER_FEE_SETTINGS_PUBLIC,
});

const refreshOrderFeeSettingsPublicCache = refreshCacheOnWrite({
  namespace: CACHE_NAMESPACE,
  ttlSeconds: CACHE_TTL.ORDER_FEE_SETTINGS_PUBLIC,
  load: () => orderFeeSettingsService.getSettings(),
});

export const orderFeeSettingsRoutes = Router();

orderFeeSettingsRoutes.get("/", orderFeeSettingsPublicCache, orderFeeSettingsController.get);

orderFeeSettingsRoutes.get(
  "/history",
  ...requireAdmin,
  validate({ query: listOrderFeeSettingsHistoryQuerySchema }),
  orderFeeSettingsController.listHistory,
);

orderFeeSettingsRoutes.patch(
  "/",
  ...requireAdmin,
  validate({ body: updateOrderFeeSettingsSchema }),
  refreshOrderFeeSettingsPublicCache,
  orderFeeSettingsController.update,
);
