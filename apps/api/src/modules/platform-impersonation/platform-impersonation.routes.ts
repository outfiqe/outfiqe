import { Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformRole } from "#modules/platform-access/platform-access.middleware.js";
import { requirePlatformNavItem } from "#modules/platform-nav-access/platform-nav-access.middleware.js";

import {
  IMPERSONATION_REDEEM_RATE_LIMIT_MAX_REQUESTS,
  IMPERSONATION_REDEEM_RATE_LIMIT_WINDOW_MS,
} from "./platform-impersonation.constants.js";
import { platformImpersonationController } from "./platform-impersonation.controller.js";
import {
  candidatesQuerySchema,
  historyQuerySchema,
  redeemExchangeCodeBodySchema,
  sessionIdParamsSchema,
  startImpersonationBodySchema,
} from "./platform-impersonation.schemas.js";

export const platformImpersonationRoutes = Router();

const impersonateChain = [
  ...requirePlatformRole("platform:impersonate"),
  requirePlatformNavItem("platform-impersonation"),
];

const redeemRateLimit = rateLimit({
  namespace: "impersonation-redeem-ip",
  windowMs: IMPERSONATION_REDEEM_RATE_LIMIT_WINDOW_MS,
  max: IMPERSONATION_REDEEM_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (req) => req.ip,
  message: "Too many attempts. Please ask for a new support link.",
});

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

platformImpersonationRoutes.post(
  "/impersonation/:sessionId/open",
  ...impersonateChain,
  validate({ params: sessionIdParamsSchema }),
  platformImpersonationController.openSession,
);

platformImpersonationRoutes.post(
  "/impersonation/redeem",
  redeemRateLimit,
  validate({ body: redeemExchangeCodeBodySchema }),
  platformImpersonationController.redeem,
);
