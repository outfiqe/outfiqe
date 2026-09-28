import { Router } from "express";

import { cache, refreshCacheOnWrite } from "#middlewares/cache.js";
import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";
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
  ...platformGuards.ordersRead,
  validate({ query: listDeliveryZoneHistoryQuerySchema }),
  deliveryZoneController.listHistory,
);

deliveryZoneRoutes.post(
  "/",
  ...platformGuards.ordersManage,
  validate({ body: createDeliveryZoneSchema }),
  refreshDeliveryZonesPublicCache,
  deliveryZoneController.create,
);

deliveryZoneRoutes.patch(
  "/:zoneId",
  ...platformGuards.ordersManage,
  validate({ params: deliveryZoneIdParamSchema, body: updateDeliveryZoneSchema }),
  refreshDeliveryZonesPublicCache,
  deliveryZoneController.update,
);

deliveryZoneRoutes.patch(
  "/:zoneId/default",
  ...platformGuards.ordersManage,
  validate({ params: deliveryZoneIdParamSchema }),
  refreshDeliveryZonesPublicCache,
  deliveryZoneController.setDefault,
);

deliveryZoneRoutes.delete(
  "/:zoneId",
  ...platformGuards.ordersManage,
  validate({ params: deliveryZoneIdParamSchema }),
  refreshDeliveryZonesPublicCache,
  deliveryZoneController.remove,
);
