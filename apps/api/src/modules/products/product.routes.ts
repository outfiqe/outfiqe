import { Router } from "express";

import { productController } from "./product.controller.js";
import {
  createProductSchema,
  listPublicProductsQuerySchema,
  listReviewProductsQuerySchema,
  productIdParamSchema,
  updateProductSchema,
} from "./product.schemas.js";

import { optionalAuth } from "../../shared/middlewares/optional-auth.js";
import { requireAuth } from "../../shared/middlewares/require-auth.js";
import { requireRole } from "../../shared/middlewares/require-role.js";
import { validate } from "../../shared/middlewares/validate.js";

import { UserRole } from "../../generated/prisma/enums.js";

const requireBrandOwner = [requireAuth, requireRole(UserRole.BRAND_OWNER)];
const requireAdmin = [requireAuth, requireRole(UserRole.ADMIN)];

export const productRoutes = Router();

productRoutes.get("/mine", ...requireBrandOwner, productController.listMine);
productRoutes.get(
  "/review",
  ...requireAdmin,
  validate({ query: listReviewProductsQuerySchema }),
  productController.listForReview,
);
productRoutes.get("/trending", productController.listTrending);
productRoutes.get("/new-arrivals", productController.listNewArrivals);

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
