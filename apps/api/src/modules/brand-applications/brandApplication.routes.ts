import { Router } from "express";

import { brandApplicationController } from "./brandApplication.controller.js";
import {
  brandApplicationIdParamSchema,
  createBrandApplicationSchema,
  listBrandApplicationsQuerySchema,
  rejectBrandApplicationSchema,
} from "./brandApplication.schemas.js";

import { rateLimit } from "../../shared/middlewares/rate-limit.js";
import { requireAuth } from "../../shared/middlewares/require-auth.js";
import { requireRole } from "../../shared/middlewares/require-role.js";
import { validate, validated } from "../../shared/middlewares/validate.js";

import { UserRole } from "../../generated/prisma/enums.js";
import type { CreateBrandApplicationBody } from "./brandApplication.schemas.js";

const WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_REQUESTS = 3;

const brandApplicationRateLimit = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS,
  keyGenerator: (_req, res) => validated.body<CreateBrandApplicationBody>(res).phone,
  message: "Too many applications from this number. Please try again tomorrow.",
});

const requireAdmin = [requireAuth, requireRole(UserRole.ADMIN)];

export const brandApplicationRoutes = Router();

brandApplicationRoutes.post(
  "/",
  validate({ body: createBrandApplicationSchema }),
  brandApplicationRateLimit,
  brandApplicationController.create,
);

brandApplicationRoutes.get(
  "/",
  ...requireAdmin,
  validate({ query: listBrandApplicationsQuerySchema }),
  brandApplicationController.list,
);

brandApplicationRoutes.post(
  "/:id/approve",
  ...requireAdmin,
  validate({ params: brandApplicationIdParamSchema }),
  brandApplicationController.approve,
);

brandApplicationRoutes.post(
  "/:id/reject",
  ...requireAdmin,
  validate({ params: brandApplicationIdParamSchema, body: rejectBrandApplicationSchema }),
  brandApplicationController.reject,
);
