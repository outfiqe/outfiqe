import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";

import { saleController } from "./sale.controller.js";
import { listTopSaleQuerySchema, saleDebugParamSchema } from "./sale.schemas.js";

const requireAdmin = [requireAuth, requirePlatformAccess];

export const saleRoutes = Router();

saleRoutes.get(
  "/products",
  ...requireAdmin,
  validate({ query: listTopSaleQuerySchema }),
  saleController.listTop,
);
saleRoutes.get(
  "/products/:productId/debug",
  ...requireAdmin,
  validate({ params: saleDebugParamSchema }),
  saleController.getDebugSnapshot,
);
