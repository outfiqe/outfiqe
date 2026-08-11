import { Router } from "express";

import { categoryController } from "./category.controller.js";
import {
  categoryIdParamSchema,
  createCategorySchema,
  updateCategorySchema,
} from "./category.schemas.js";

import { requireAuth } from "../../shared/middlewares/require-auth.js";
import { requireRole } from "../../shared/middlewares/require-role.js";
import { validate } from "../../shared/middlewares/validate.js";

import { UserRole } from "../../generated/prisma/enums.js";

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
