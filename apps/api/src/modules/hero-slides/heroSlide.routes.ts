import { Router } from "express";

import { heroSlideController } from "./heroSlide.controller.js";
import {
  createHeroSlideSchema,
  heroSlideIdParamSchema,
  updateHeroSlideSchema,
} from "./heroSlide.schemas.js";

import { requireAuth } from "../../shared/middlewares/require-auth.js";
import { requireRole } from "../../shared/middlewares/require-role.js";
import { validate } from "../../shared/middlewares/validate.js";

import { UserRole } from "../../generated/prisma/enums.js";

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
