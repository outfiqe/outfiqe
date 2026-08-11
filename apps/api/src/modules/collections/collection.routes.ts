import { Router } from "express";

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

import { requireAuth } from "../../shared/middlewares/require-auth.js";
import { requireRole } from "../../shared/middlewares/require-role.js";
import { validate } from "../../shared/middlewares/validate.js";

import { UserRole } from "../../generated/prisma/enums.js";

const requireAdmin = [requireAuth, requireRole(UserRole.ADMIN)];

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
