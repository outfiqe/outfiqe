import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { requireActiveAuth } from "#middlewares/require-active-account.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";

import { logisticsBrandWriteRateLimit } from "../logistics.rate-limits.js";
import { logisticsBrandReturnController } from "./brand-return.controller.js";
import { brandReturnIdParamSchema, listBrandReturnsQuerySchema } from "./brand-return.schemas.js";

const requireBrandOwner = [...requireActiveAuth, requireRole(UserRole.BRAND_OWNER)];

export const logisticsBrandReturnRoutes = Router();

logisticsBrandReturnRoutes.get(
  "/",
  ...requireBrandOwner,
  validate({ query: listBrandReturnsQuerySchema }),
  logisticsBrandReturnController.listMine,
);

logisticsBrandReturnRoutes.post(
  "/:brandReturnId/confirm",
  ...requireBrandOwner,
  logisticsBrandWriteRateLimit,
  validate({ params: brandReturnIdParamSchema }),
  logisticsBrandReturnController.confirmMine,
);
