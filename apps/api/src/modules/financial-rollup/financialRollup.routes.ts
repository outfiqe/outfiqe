import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";

import { financialRollupController } from "./financialRollup.controller.js";
import { financialRollupQuerySchema } from "./financialRollup.schemas.js";

export const financialRollupRoutes = Router();

financialRollupRoutes.get(
  "/",
  requireAuth,
  requireRole(UserRole.ADMIN),
  validate({ query: financialRollupQuerySchema }),
  financialRollupController.get,
);
