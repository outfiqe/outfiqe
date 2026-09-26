import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import { saleController } from "./sale.controller.js";
import { listTopSaleQuerySchema, saleDebugParamSchema } from "./sale.schemas.js";

export const saleRoutes = Router();

saleRoutes.get(
  "/products",
  ...platformGuards.catalogRead,
  validate({ query: listTopSaleQuerySchema }),
  saleController.listTop,
);
saleRoutes.get(
  "/products/:productId/debug",
  ...platformGuards.catalogRead,
  validate({ params: saleDebugParamSchema }),
  saleController.getDebugSnapshot,
);
