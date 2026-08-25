import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
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
  collectionController.create,
);
collectionRoutes.patch(
  "/:id",
  ...requireAdmin,
  validate({ params: collectionIdParamSchema, body: updateCollectionSchema }),
  collectionController.update,
);
collectionRoutes.patch(
  "/:id/products",
  ...requireAdmin,
  validate({ params: collectionIdParamSchema, body: setCollectionProductsSchema }),
  collectionController.setProducts,
);
