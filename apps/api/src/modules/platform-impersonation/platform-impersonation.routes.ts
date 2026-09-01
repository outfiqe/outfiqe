import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { requirePlatformRole } from "#modules/platform-access/platform-access.middleware.js";

import { platformImpersonationController } from "./platform-impersonation.controller.js";
import {
  historyQuerySchema,
  sessionIdParamsSchema,
  startImpersonationBodySchema,
} from "./platform-impersonation.schemas.js";

export const platformImpersonationRoutes = Router();

const impersonateChain = requirePlatformRole("platform:impersonate");

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
