import { Router } from "express";

import { crmWriteRateLimit } from "#middlewares/crm-rate-limit.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";

import { platformNavAccessController } from "./platform-nav-access.controller.js";
import { requireCoFounder } from "./platform-nav-access.middleware.js";
import {
  coFounderParamsSchema,
  promoteCoFounderBodySchema,
  setHiddenNavKeysBodySchema,
} from "./platform-nav-access.schemas.js";

export const platformNavAccessRoutes = Router();

platformNavAccessRoutes.get(
  "/nav-access",
  requireAuth,
  requirePlatformAccess,
  platformNavAccessController.getOverview,
);

platformNavAccessRoutes.put(
  "/nav-access/hidden",
  ...requireCoFounder,
  crmWriteRateLimit,
  validate({ body: setHiddenNavKeysBodySchema }),
  platformNavAccessController.setHiddenNavKeys,
);

platformNavAccessRoutes.get(
  "/nav-access/co-founders/candidates",
  ...requireCoFounder,
  platformNavAccessController.listCandidates,
);

platformNavAccessRoutes.post(
  "/nav-access/co-founders",
  ...requireCoFounder,
  crmWriteRateLimit,
  validate({ body: promoteCoFounderBodySchema }),
  platformNavAccessController.promoteCoFounder,
);

platformNavAccessRoutes.delete(
  "/nav-access/co-founders/:membershipId",
  ...requireCoFounder,
  crmWriteRateLimit,
  validate({ params: coFounderParamsSchema }),
  platformNavAccessController.demoteCoFounder,
);
