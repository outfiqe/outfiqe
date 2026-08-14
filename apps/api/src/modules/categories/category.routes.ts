import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { cache, refreshCacheOnWrite } from "#middlewares/cache.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";
import { CACHE_TTL } from "#redis/redis.keys.js";

import { categoryController } from "./category.controller.js";
import {
  categoryIdParamSchema,
  createCategorySchema,
  updateCategorySchema,
} from "./category.schemas.js";
import { categoryService } from "./category.service.js";

const requireAdmin = [requireAuth, requireRole(UserRole.ADMIN)];

const CACHE_NAMESPACE = "categories";

const categoriesPublicCache = cache({
  namespace: CACHE_NAMESPACE,
  ttlSeconds: CACHE_TTL.CATEGORIES_PUBLIC,
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
