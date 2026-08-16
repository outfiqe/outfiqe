import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { optionalAuth } from "#middlewares/optional-auth.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";
import { listBrandProductsQuerySchema } from "#modules/products/product.schemas.js";

import { brandController } from "./brand.controller.js";
import {
  brandIdParamSchema,
  listBrandsQuerySchema,
  updateBrandProfileSchema,
} from "./brand.schemas.js";

export const brandRoutes = Router();

brandRoutes.get(
  "/",
  optionalAuth,
  validate({ query: listBrandsQuerySchema }),
  brandController.listPublic,
);

brandRoutes.get("/me", requireAuth, requireRole(UserRole.BRAND_OWNER), brandController.me);
brandRoutes.patch(
  "/me",
  requireAuth,
  requireRole(UserRole.BRAND_OWNER),
  validate({ body: updateBrandProfileSchema }),
  brandController.updateMe,
);

brandRoutes.get(
  "/:id",
  optionalAuth,
  validate({ params: brandIdParamSchema }),
  brandController.getPublicById,
);
brandRoutes.get(
  "/:id/products",
  validate({ params: brandIdParamSchema, query: listBrandProductsQuerySchema }),
  brandController.listProducts,
);
