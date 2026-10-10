import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { rateLimit } from "#middlewares/rate-limit.js";
import { requireActiveAuth } from "#middlewares/require-active-account.js";
import { getAuthPrincipal } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";

import { sizeStandardController } from "./sizeStandard.controller.js";
import {
  createSizeStandardSchema,
  sizeStandardIdParamSchema,
  updateSizeStandardSchema,
} from "./sizeStandard.schemas.js";

const MUTATION_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MUTATION_RATE_LIMIT_MAX_REQUESTS = 30;

const requireBrandOwner = [...requireActiveAuth, requireRole(UserRole.BRAND_OWNER)];

const mutationRateLimit = rateLimit({
  namespace: "size-standards-mutation",
  windowMs: MUTATION_RATE_LIMIT_WINDOW_MS,
  max: MUTATION_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
});

export const sizeStandardRoutes = Router();

sizeStandardRoutes.get("/", ...requireBrandOwner, sizeStandardController.listMine);

sizeStandardRoutes.post(
  "/",
  ...requireBrandOwner,
  mutationRateLimit,
  validate({ body: createSizeStandardSchema }),
  sizeStandardController.create,
);

sizeStandardRoutes.patch(
  "/:id",
  ...requireBrandOwner,
  mutationRateLimit,
  validate({ params: sizeStandardIdParamSchema, body: updateSizeStandardSchema }),
  sizeStandardController.update,
);

sizeStandardRoutes.delete(
  "/:id",
  ...requireBrandOwner,
  mutationRateLimit,
  validate({ params: sizeStandardIdParamSchema }),
  sizeStandardController.archive,
);
