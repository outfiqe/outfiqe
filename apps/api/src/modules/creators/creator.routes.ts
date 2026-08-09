import { Router } from "express";

import { creatorController } from "./creator.controller.js";
import { creatorUserIdParamSchema, listCreatorsQuerySchema } from "./creator.schemas.js";

import { requireAuth } from "../../shared/middlewares/require-auth.js";
import { requireRole } from "../../shared/middlewares/require-role.js";
import { validate } from "../../shared/middlewares/validate.js";

import { UserRole } from "../../generated/prisma/enums.js";

const requireAdmin = [requireAuth, requireRole(UserRole.ADMIN)];

export const creatorRoutes = Router();

creatorRoutes.post("/apply", requireAuth, creatorController.apply);
creatorRoutes.get("/me", requireAuth, creatorController.me);
creatorRoutes.get(
  "/",
  ...requireAdmin,
  validate({ query: listCreatorsQuerySchema }),
  creatorController.list,
);
creatorRoutes.post(
  "/:userId/approve",
  ...requireAdmin,
  validate({ params: creatorUserIdParamSchema }),
  creatorController.approve,
);
creatorRoutes.post(
  "/:userId/reject",
  ...requireAdmin,
  validate({ params: creatorUserIdParamSchema }),
  creatorController.reject,
);
