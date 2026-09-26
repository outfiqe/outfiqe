import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import { sizeOptionController } from "./size-option.controller.js";
import {
  createSizeOptionSchema,
  listSizeOptionsQuerySchema,
  sizeOptionIdParamSchema,
} from "./size-option.schemas.js";

const requireBrandOwner = [requireAuth, requireRole(UserRole.BRAND_OWNER)];

export const sizeOptionRoutes = Router();

sizeOptionRoutes.get("/admin", ...platformGuards.catalogRead, sizeOptionController.listAll);

sizeOptionRoutes.get(
  "/",
  ...requireBrandOwner,
  validate({ query: listSizeOptionsQuerySchema }),
  sizeOptionController.listByType,
);

sizeOptionRoutes.post(
  "/",
  ...platformGuards.catalogManage,
  validate({ body: createSizeOptionSchema }),
  sizeOptionController.create,
);

sizeOptionRoutes.delete(
  "/:id",
  ...platformGuards.catalogManage,
  validate({ params: sizeOptionIdParamSchema }),
  sizeOptionController.delete,
);
