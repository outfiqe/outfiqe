import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";

import { heroSlideController } from "./heroSlide.controller.js";
import {
  createHeroSlideSchema,
  heroSlideIdParamSchema,
  updateHeroSlideSchema,
} from "./heroSlide.schemas.js";

const requireAdmin = [requireAuth, requireRole(UserRole.ADMIN)];

export const heroSlideRoutes = Router();

heroSlideRoutes.get("/admin", ...requireAdmin, heroSlideController.listAll);

heroSlideRoutes.get("/", heroSlideController.listPublic);

heroSlideRoutes.post(
  "/",
  ...requireAdmin,
  validate({ body: createHeroSlideSchema }),
  heroSlideController.create,
);
heroSlideRoutes.patch(
  "/:id",
  ...requireAdmin,
  validate({ params: heroSlideIdParamSchema, body: updateHeroSlideSchema }),
  heroSlideController.update,
);
