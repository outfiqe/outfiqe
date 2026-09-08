import { WEB_REVALIDATE_TAGS } from "@outfiqe/utils";
import { Router } from "express";

import { cache, refreshCacheOnWrite } from "#middlewares/cache.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { revalidateWebCacheOnWrite } from "#middlewares/revalidate-web-cache.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";
import { CACHE_TTL } from "#redis/redis.keys.js";

import { categoryController } from "./category.controller.js";
import {
  categoryIdParamSchema,
  createCategorySchema,
  reorderCategoriesSchema,
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

const revalidateCategoriesWebCache = revalidateWebCacheOnWrite(WEB_REVALIDATE_TAGS.categories);

export const categoryRoutes = Router();

categoryRoutes.get("/admin", ...requireAdmin, categoryController.listAll);

categoryRoutes.get("/", categoriesPublicCache, categoryController.listPublic);

categoryRoutes.post(
  "/",
  ...requireAdmin,
  validate({ body: createCategorySchema }),
  refreshCategoriesPublicCache,
  revalidateCategoriesWebCache,
  categoryController.create,
);
categoryRoutes.post(
  "/reorder",
  ...requireAdmin,
  validate({ body: reorderCategoriesSchema }),
  refreshCategoriesPublicCache,
  revalidateCategoriesWebCache,
  categoryController.reorder,
);
categoryRoutes.patch(
  "/:id",
  ...requireAdmin,
  validate({ params: categoryIdParamSchema, body: updateCategorySchema }),
  refreshCategoriesPublicCache,
  revalidateCategoriesWebCache,
  categoryController.update,
);
