import { Router } from "express";

import { brandController } from "./brand.controller.js";

import { requireAuth } from "../../shared/middlewares/require-auth.js";
import { requireRole } from "../../shared/middlewares/require-role.js";

import { UserRole } from "../../generated/prisma/enums.js";

export const brandRoutes = Router();

brandRoutes.get("/me", requireAuth, requireRole(UserRole.BRAND_OWNER), brandController.me);
