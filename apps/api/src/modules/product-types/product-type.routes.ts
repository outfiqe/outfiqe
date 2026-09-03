import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { cache, refreshCacheOnWrite } from "#middlewares/cache.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";
import { CACHE_TTL } from "#redis/redis.keys.js";

import { productTypeController } from "./product-type.controller.js";
import {
  createProductTypeSchema,
  productTypeIdParamSchema,
  reorderProductTypesSchema,
  updateProductTypeSchema,
} from "./product-type.schemas.js";
import { productTypeService } from "./product-type.service.js";

const requireAdmin = [requireAuth, requirePlatformAccess];
const requireBrandOwner = [requireAuth, requireRole(UserRole.BRAND_OWNER)];

const CACHE_NAMESPACE = "product-types";

const productTypesPublicCache = cache({
  namespace: CACHE_NAMESPACE,
  ttlSeconds: CACHE_TTL.PRODUCT_TYPES_PUBLIC,
  successMessage: "Garment types.",
});

const refreshProductTypesPublicCache = refreshCacheOnWrite({
  namespace: CACHE_NAMESPACE,
  ttlSeconds: CACHE_TTL.PRODUCT_TYPES_PUBLIC,
  load: () => productTypeService.listForStorefront(),
});

export const productTypeRoutes = Router();

productTypeRoutes.get("/admin", ...requireAdmin, productTypeController.listAll);

productTypeRoutes.get("/assignable", ...requireBrandOwner, productTypeController.listAssignable);

productTypeRoutes.get("/", productTypesPublicCache, productTypeController.listActive);

productTypeRoutes.post(
  "/",
  ...requireAdmin,
  validate({ body: createProductTypeSchema }),
  refreshProductTypesPublicCache,
  productTypeController.create,
);
productTypeRoutes.post(
  "/reorder",
  ...requireAdmin,
  validate({ body: reorderProductTypesSchema }),
  refreshProductTypesPublicCache,
  productTypeController.reorder,
);
productTypeRoutes.patch(
  "/:id",
  ...requireAdmin,
  validate({ params: productTypeIdParamSchema, body: updateProductTypeSchema }),
  refreshProductTypesPublicCache,
  productTypeController.update,
);
