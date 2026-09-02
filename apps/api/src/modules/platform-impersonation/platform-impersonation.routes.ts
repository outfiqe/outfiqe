import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { requirePlatformRole } from "#modules/platform-access/platform-access.middleware.js";
import { requirePlatformNavItem } from "#modules/platform-nav-access/platform-nav-access.middleware.js";

import { platformImpersonationController } from "./platform-impersonation.controller.js";
import {
  candidatesQuerySchema,
  historyQuerySchema,
  sessionIdParamsSchema,
  startImpersonationBodySchema,
} from "./platform-impersonation.schemas.js";

export const platformImpersonationRoutes = Router();

const impersonateChain = [
  ...requirePlatformRole("platform:impersonate"),
  requirePlatformNavItem("platform-impersonation"),
];

platformImpersonationRoutes.post(
  "/impersonation",
  ...impersonateChain,
  validate({ body: startImpersonationBodySchema }),
  platformImpersonationController.start,
);

platformImpersonationRoutes.get(
  "/impersonation/active",
  ...impersonateChain,
  platformImpersonationController.listActive,
);

platformImpersonationRoutes.get(
  "/impersonation/candidates",
  ...impersonateChain,
  validate({ query: candidatesQuerySchema }),
  platformImpersonationController.candidates,
);

platformImpersonationRoutes.get(
  "/impersonation",
  ...impersonateChain,
  validate({ query: historyQuerySchema }),
  platformImpersonationController.history,
);

platformImpersonationRoutes.delete(
  "/impersonation/:sessionId",
  ...impersonateChain,
  validate({ params: sessionIdParamsSchema }),
  platformImpersonationController.revoke,
);
