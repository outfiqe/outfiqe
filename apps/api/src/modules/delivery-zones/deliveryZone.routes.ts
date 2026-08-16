import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { cache, refreshCacheOnWrite } from "#middlewares/cache.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";
import { CACHE_TTL } from "#redis/redis.keys.js";

import { deliveryZoneController } from "./deliveryZone.controller.js";
import {
  createDeliveryZoneSchema,
  deliveryZoneIdParamSchema,
  listDeliveryZoneHistoryQuerySchema,
  updateDeliveryZoneSchema,
} from "./deliveryZone.schemas.js";
import { deliveryZoneService } from "./deliveryZone.service.js";

const requireAdmin = [requireAuth, requireRole(UserRole.ADMIN)];

const CACHE_NAMESPACE = "delivery-zones";

const deliveryZonesPublicCache = cache({
  namespace: CACHE_NAMESPACE,
  ttlSeconds: CACHE_TTL.DELIVERY_ZONES_PUBLIC,
});

const refreshDeliveryZonesPublicCache = refreshCacheOnWrite({
  namespace: CACHE_NAMESPACE,
  ttlSeconds: CACHE_TTL.DELIVERY_ZONES_PUBLIC,
  load: () => deliveryZoneService.listPublic(),
});

export const deliveryZoneRoutes = Router();

deliveryZoneRoutes.get("/", deliveryZonesPublicCache, deliveryZoneController.list);

deliveryZoneRoutes.get(
  "/history",
  ...requireAdmin,
  validate({ query: listDeliveryZoneHistoryQuerySchema }),
  deliveryZoneController.listHistory,
);

deliveryZoneRoutes.post(
  "/",
  ...requireAdmin,
  validate({ body: createDeliveryZoneSchema }),
  refreshDeliveryZonesPublicCache,
  deliveryZoneController.create,
);

deliveryZoneRoutes.patch(
  "/:zoneId",
  ...requireAdmin,
  validate({ params: deliveryZoneIdParamSchema, body: updateDeliveryZoneSchema }),
  refreshDeliveryZonesPublicCache,
  deliveryZoneController.update,
);

deliveryZoneRoutes.patch(
  "/:zoneId/default",
  ...requireAdmin,
  validate({ params: deliveryZoneIdParamSchema }),
  refreshDeliveryZonesPublicCache,
  deliveryZoneController.setDefault,
);

deliveryZoneRoutes.delete(
  "/:zoneId",
  ...requireAdmin,
  validate({ params: deliveryZoneIdParamSchema }),
  refreshDeliveryZonesPublicCache,
  deliveryZoneController.remove,
);
