import { Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import {
  OAUTH_LINK_CONFIRM_IP_RATE_LIMIT_MAX_REQUESTS,
  OAUTH_LINK_CONFIRM_IP_RATE_LIMIT_WINDOW_MS,
  OAUTH_LINK_START_IP_RATE_LIMIT_MAX_REQUESTS,
  OAUTH_LINK_START_IP_RATE_LIMIT_WINDOW_MS,
  OAUTH_START_IP_RATE_LIMIT_MAX_REQUESTS,
  OAUTH_START_IP_RATE_LIMIT_WINDOW_MS,
} from "./oauth.constants.js";
import { oauthController } from "./oauth.controller.js";
import {
  oauthCallbackQuerySchema,
  oauthLinkConfirmBodySchema,
  oauthProviderParamsSchema,
  oauthStartQuerySchema,
  oauthUnlinkBodySchema,
} from "./oauth.schemas.js";

const oauthStartIpRateLimit = rateLimit({
  namespace: "oauth-start-ip",
  windowMs: OAUTH_START_IP_RATE_LIMIT_WINDOW_MS,
  max: OAUTH_START_IP_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (req) => req.ip,
  message: "Too many sign-in attempts. Please try again in 15 minutes.",
});

const oauthLinkStartIpRateLimit = rateLimit({
  namespace: "oauth-link-start-ip",
  windowMs: OAUTH_LINK_START_IP_RATE_LIMIT_WINDOW_MS,
  max: OAUTH_LINK_START_IP_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (req) => req.ip,
  message: "Too many connection attempts. Please try again in 15 minutes.",
});

const oauthLinkConfirmIpRateLimit = rateLimit({
  namespace: "oauth-link-confirm-ip",
  windowMs: OAUTH_LINK_CONFIRM_IP_RATE_LIMIT_WINDOW_MS,
  max: OAUTH_LINK_CONFIRM_IP_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (req) => req.ip,
  message: "Too many attempts. Please try again in 15 minutes.",
});

export const oauthRoutes = Router();

oauthRoutes.get("/linked", requireAuth, oauthController.linked);

oauthRoutes.get(
  "/:provider/start",
  oauthStartIpRateLimit,
  validate({ params: oauthProviderParamsSchema, query: oauthStartQuerySchema }),
  oauthController.start,
);

oauthRoutes.get(
  "/:provider/link/start",
  requireAuth,
  oauthLinkStartIpRateLimit,
  validate({ params: oauthProviderParamsSchema }),
  oauthController.linkStart,
);

oauthRoutes.get(
  "/:provider/callback",
  validate({ params: oauthProviderParamsSchema, query: oauthCallbackQuerySchema }),
  oauthController.callback,
);

oauthRoutes.post(
  "/:provider/link/confirm",
  oauthLinkConfirmIpRateLimit,
  validate({ params: oauthProviderParamsSchema, body: oauthLinkConfirmBodySchema }),
  oauthController.confirmLink,
);

oauthRoutes.delete(
  "/:provider/link",
  requireAuth,
  validate({ params: oauthProviderParamsSchema, body: oauthUnlinkBodySchema }),
  oauthController.unlink,
);
