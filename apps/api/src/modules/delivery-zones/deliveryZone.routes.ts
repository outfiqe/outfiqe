import { Router } from "express";

import { cache, refreshCacheOnWrite } from "#middlewares/cache.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";
import { CACHE_TTL } from "#redis/redis.keys.js";

import { deliveryZoneController } from "./deliveryZone.controller.js";
import {
  createDeliveryZoneSchema,
  deliveryZoneIdParamSchema,
  listDeliveryZoneHistoryQuerySchema,
  searchDeliveryZoneCitiesQuerySchema,
  updateDeliveryZoneSchema,
} from "./deliveryZone.schemas.js";
import { deliveryZoneService } from "./deliveryZone.service.js";

const requireAdmin = [requireAuth, requirePlatformAccess];

const CACHE_NAMESPACE = "delivery-zones";

const deliveryZonesPublicCache = cache({
  namespace: CACHE_NAMESPACE,
  ttlSeconds: CACHE_TTL.DELIVERY_ZONES_PUBLIC,
  successMessage: "Delivery zones.",
});

const refreshDeliveryZonesPublicCache = refreshCacheOnWrite({
  namespace: CACHE_NAMESPACE,
  ttlSeconds: CACHE_TTL.DELIVERY_ZONES_PUBLIC,
  load: () => deliveryZoneService.listPublic(),
});

export const deliveryZoneRoutes = Router();

deliveryZoneRoutes.get("/", deliveryZonesPublicCache, deliveryZoneController.list);

deliveryZoneRoutes.get(
  "/cities",
  validate({ query: searchDeliveryZoneCitiesQuerySchema }),
  deliveryZoneController.searchCities,
);

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
