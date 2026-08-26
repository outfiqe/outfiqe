import { Router } from "express";

import { cache, refreshCacheOnWrite } from "#middlewares/cache.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";
import { CACHE_TTL } from "#redis/redis.keys.js";

import { categoryController } from "./category.controller.js";
import {
  categoryIdParamSchema,
  createCategorySchema,
  updateCategorySchema,
} from "./category.schemas.js";
import { categoryService } from "./category.service.js";

const requireAdmin = [requireAuth, requirePlatformAccess];

const CACHE_NAMESPACE = "categories";

const categoriesPublicCache = cache({
  namespace: CACHE_NAMESPACE,
  ttlSeconds: CACHE_TTL.CATEGORIES_PUBLIC,
  successMessage: "Categories.",
});

const refreshCategoriesPublicCache = refreshCacheOnWrite({
  namespace: CACHE_NAMESPACE,
  ttlSeconds: CACHE_TTL.CATEGORIES_PUBLIC,
  load: () => categoryService.listPublic(),
});

export const categoryRoutes = Router();

categoryRoutes.get("/admin", ...requireAdmin, categoryController.listAll);

categoryRoutes.get("/", categoriesPublicCache, categoryController.listPublic);

categoryRoutes.post(
  "/",
  ...requireAdmin,
  validate({ body: createCategorySchema }),
  refreshCategoriesPublicCache,
  categoryController.create,
);
categoryRoutes.patch(
  "/:id",
  ...requireAdmin,
  validate({ params: categoryIdParamSchema, body: updateCategorySchema }),
  refreshCategoriesPublicCache,
  categoryController.update,
);
