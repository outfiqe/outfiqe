import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { optionalAuth } from "#middlewares/optional-auth.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";

import { productController } from "./product.controller.js";
import {
  adjustStockSchema,
  autocompleteQuerySchema,
  createProductSchema,
  listMineProductsQuerySchema,
  listPublicProductsQuerySchema,
  listReviewProductsQuerySchema,
  productIdParamSchema,
  updateProductSchema,
} from "./product.schemas.js";

const requireBrandOwner = [requireAuth, requireRole(UserRole.BRAND_OWNER)];
const requireAdmin = [requireAuth, requirePlatformAccess];

export const productRoutes = Router();

productRoutes.get(
  "/mine",
  ...requireBrandOwner,
  validate({ query: listMineProductsQuerySchema }),
  productController.listMine,
);
productRoutes.get(
  "/review",
  ...requireAdmin,
  validate({ query: listReviewProductsQuerySchema }),
  productController.listForReview,
);
productRoutes.get("/trending", productController.listTrending);
productRoutes.get("/new-arrivals", productController.listNewArrivals);
productRoutes.get(
  "/autocomplete",
  validate({ query: autocompleteQuerySchema }),
  productController.autocomplete,
);

productRoutes.get(
  "/",
  validate({ query: listPublicProductsQuerySchema }),
  productController.listPublic,
);
productRoutes.get(
  "/:id",
  optionalAuth,
  validate({ params: productIdParamSchema }),
  productController.getPublicById,
);

productRoutes.post(
  "/",
  ...requireBrandOwner,
  validate({ body: createProductSchema }),
  productController.create,
);
productRoutes.patch(
  "/:id",
  ...requireBrandOwner,
  validate({ params: productIdParamSchema, body: updateProductSchema }),
  productController.update,
);
productRoutes.patch(
  "/:id/stock",
  ...requireBrandOwner,
  validate({ params: productIdParamSchema, body: adjustStockSchema }),
  productController.adjustStock,
);
productRoutes.delete(
  "/:id",
  ...requireBrandOwner,
  validate({ params: productIdParamSchema }),
  productController.delete,
);
productRoutes.post(
  "/:id/approve",
  ...requireAdmin,
  validate({ params: productIdParamSchema }),
  productController.approve,
);
productRoutes.post(
  "/:id/reject",
  ...requireAdmin,
  validate({ params: productIdParamSchema }),
  productController.reject,
);
