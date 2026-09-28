import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { optionalAuth } from "#middlewares/optional-auth.js";
import { requireActiveAuth } from "#middlewares/require-active-account.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import { productController } from "./product.controller.js";
import {
  adjustStockSchema,
  autocompleteQuerySchema,
  createProductSchema,
  listMineProductsQuerySchema,
  listPublicProductsQuerySchema,
  listReviewProductsQuerySchema,
  productIdParamSchema,
  setProductDiscountSchema,
  updateProductDiscountSchema,
  updateProductSchema,
} from "./product.schemas.js";

const requireBrandOwner = [...requireActiveAuth, requireRole(UserRole.BRAND_OWNER)];

export const productRoutes = Router();

productRoutes.get(
  "/mine",
  ...requireBrandOwner,
  validate({ query: listMineProductsQuerySchema }),
  productController.listMine,
);
productRoutes.get(
  "/review",
  ...platformGuards.catalogRead,
  validate({ query: listReviewProductsQuerySchema }),
  productController.listForReview,
);
productRoutes.get("/trending", optionalAuth, productController.listTrending);
productRoutes.get("/sale", optionalAuth, productController.listSale);
productRoutes.get("/new-arrivals", optionalAuth, productController.listNewArrivals);
productRoutes.get(
  "/autocomplete",
  validate({ query: autocompleteQuerySchema }),
  productController.autocomplete,
);

productRoutes.get(
  "/",
  optionalAuth,
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
  "/:id/discount",
  ...requireBrandOwner,
  validate({ params: productIdParamSchema, body: setProductDiscountSchema }),
  productController.setDiscount,
);
productRoutes.patch(
  "/:id/discount",
  ...requireBrandOwner,
  validate({ params: productIdParamSchema, body: updateProductDiscountSchema }),
  productController.updateDiscount,
);
productRoutes.delete(
  "/:id/discount",
  ...requireBrandOwner,
  validate({ params: productIdParamSchema }),
  productController.removeDiscount,
);
productRoutes.post(
  "/:id/approve",
  ...platformGuards.catalogManage,
  validate({ params: productIdParamSchema }),
  productController.approve,
);
productRoutes.post(
  "/:id/reject",
  ...platformGuards.catalogManage,
  validate({ params: productIdParamSchema }),
  productController.reject,
);
