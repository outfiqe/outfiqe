import { WEB_REVALIDATE_TAGS } from "@outfiqe/utils";
import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { revalidateWebCacheOnWrite } from "#middlewares/revalidate-web-cache.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";

import { collectionController } from "./collection.controller.js";
import {
  collectionIdParamSchema,
  collectionSlugParamSchema,
  createCollectionSchema,
  listCollectionProductsQuerySchema,
  listCollectionsQuerySchema,
  setCollectionProductsSchema,
  updateCollectionSchema,
} from "./collection.schemas.js";

const requireAdmin = [requireAuth, requirePlatformAccess];

const revalidateCollectionsWebCache = revalidateWebCacheOnWrite(WEB_REVALIDATE_TAGS.collections);

export const collectionRoutes = Router();

collectionRoutes.get("/admin", ...requireAdmin, collectionController.listAll);
collectionRoutes.get(
  "/admin/:id/products",
  ...requireAdmin,
  validate({ params: collectionIdParamSchema }),
  collectionController.listProductsForAdmin,
);

collectionRoutes.get(
  "/",
  validate({ query: listCollectionsQuerySchema }),
  collectionController.listPublic,
);
collectionRoutes.get(
  "/:slug",
  validate({ params: collectionSlugParamSchema }),
  collectionController.getPublicBySlug,
);
collectionRoutes.get(
  "/:slug/products",
  validate({ params: collectionSlugParamSchema, query: listCollectionProductsQuerySchema }),
  collectionController.listPublicProducts,
);

collectionRoutes.post(
  "/",
  ...requireAdmin,
  validate({ body: createCollectionSchema }),
  revalidateCollectionsWebCache,
  collectionController.create,
);
collectionRoutes.patch(
  "/:id",
  ...requireAdmin,
  validate({ params: collectionIdParamSchema, body: updateCollectionSchema }),
  revalidateCollectionsWebCache,
  collectionController.update,
);
collectionRoutes.patch(
  "/:id/products",
  ...requireAdmin,
  validate({ params: collectionIdParamSchema, body: setCollectionProductsSchema }),
  revalidateCollectionsWebCache,
  collectionController.setProducts,
);
