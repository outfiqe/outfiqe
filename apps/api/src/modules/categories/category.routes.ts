import { WEB_REVALIDATE_TAGS } from "@outfiqe/utils";
import { Router } from "express";

import { cache, refreshCacheOnWrite } from "#middlewares/cache.js";
import { revalidateWebCacheOnWrite } from "#middlewares/revalidate-web-cache.js";
import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";
import { CACHE_TTL } from "#redis/redis.keys.js";

import { categoryController } from "./category.controller.js";
import {
  categoryIdParamSchema,
  createCategorySchema,
  reorderCategoriesSchema,
  updateCategorySchema,
} from "./category.schemas.js";
import { categoryService } from "./category.service.js";

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

categoryRoutes.get("/admin", ...platformGuards.catalogRead, categoryController.listAll);

categoryRoutes.get("/", categoriesPublicCache, categoryController.listPublic);

categoryRoutes.post(
  "/",
  ...platformGuards.catalogManage,
  validate({ body: createCategorySchema }),
  refreshCategoriesPublicCache,
  revalidateCategoriesWebCache,
  categoryController.create,
);
categoryRoutes.post(
  "/reorder",
  ...platformGuards.catalogManage,
  validate({ body: reorderCategoriesSchema }),
  refreshCategoriesPublicCache,
  revalidateCategoriesWebCache,
  categoryController.reorder,
);
categoryRoutes.patch(
  "/:id",
  ...platformGuards.catalogManage,
  validate({ params: categoryIdParamSchema, body: updateCategorySchema }),
  refreshCategoriesPublicCache,
  revalidateCategoriesWebCache,
  categoryController.update,
);
