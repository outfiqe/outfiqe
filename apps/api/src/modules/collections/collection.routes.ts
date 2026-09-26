import { WEB_REVALIDATE_TAGS } from "@outfiqe/utils";
import { Router } from "express";

import { revalidateWebCacheOnWrite } from "#middlewares/revalidate-web-cache.js";
import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

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

const revalidateCollectionsWebCache = revalidateWebCacheOnWrite(WEB_REVALIDATE_TAGS.collections);

export const collectionRoutes = Router();

collectionRoutes.get("/admin", ...platformGuards.catalogRead, collectionController.listAll);
collectionRoutes.get(
  "/admin/:id/products",
  ...platformGuards.catalogRead,
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
  ...platformGuards.catalogManage,
  validate({ body: createCollectionSchema }),
  revalidateCollectionsWebCache,
  collectionController.create,
);
collectionRoutes.patch(
  "/:id",
  ...platformGuards.catalogManage,
  validate({ params: collectionIdParamSchema, body: updateCollectionSchema }),
  revalidateCollectionsWebCache,
  collectionController.update,
);
collectionRoutes.patch(
  "/:id/products",
  ...platformGuards.catalogManage,
  validate({ params: collectionIdParamSchema, body: setCollectionProductsSchema }),
  revalidateCollectionsWebCache,
  collectionController.setProducts,
);
