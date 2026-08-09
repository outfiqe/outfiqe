import { Router } from "express";

import { brandController } from "./brand.controller.js";
import { brandIdParamSchema } from "./brand.schemas.js";
import { listBrandProductsQuerySchema } from "../products/product.schemas.js";

import { optionalAuth } from "../../shared/middlewares/optional-auth.js";
import { requireAuth } from "../../shared/middlewares/require-auth.js";
import { requireRole } from "../../shared/middlewares/require-role.js";
import { validate } from "../../shared/middlewares/validate.js";

import { UserRole } from "../../generated/prisma/enums.js";

export const brandRoutes = Router();

brandRoutes.get("/me", requireAuth, requireRole(UserRole.BRAND_OWNER), brandController.me);

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
