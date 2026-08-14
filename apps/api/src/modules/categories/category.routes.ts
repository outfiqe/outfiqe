import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";

import { categoryController } from "./category.controller.js";
import {
  categoryIdParamSchema,
  createCategorySchema,
  updateCategorySchema,
} from "./category.schemas.js";

const requireAdmin = [requireAuth, requireRole(UserRole.ADMIN)];

export const categoryRoutes = Router();

categoryRoutes.get("/admin", ...requireAdmin, categoryController.listAll);

categoryRoutes.get("/", categoryController.listPublic);

categoryRoutes.post(
  "/",
  ...requireAdmin,
  validate({ body: createCategorySchema }),
  categoryController.create,
);
categoryRoutes.patch(
  "/:id",
  ...requireAdmin,
  validate({ params: categoryIdParamSchema, body: updateCategorySchema }),
  categoryController.update,
);
