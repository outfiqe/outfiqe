import { Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { validate } from "#middlewares/validate.js";

import {
  OAUTH_START_IP_RATE_LIMIT_MAX_REQUESTS,
  OAUTH_START_IP_RATE_LIMIT_WINDOW_MS,
} from "./oauth.constants.js";
import { oauthController } from "./oauth.controller.js";
import {
  oauthCallbackQuerySchema,
  oauthProviderParamsSchema,
  oauthStartQuerySchema,
} from "./oauth.schemas.js";

const oauthStartIpRateLimit = rateLimit({
  namespace: "oauth-start-ip",
  windowMs: OAUTH_START_IP_RATE_LIMIT_WINDOW_MS,
  max: OAUTH_START_IP_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (req) => req.ip,
  message: "Too many sign-in attempts. Please try again in 15 minutes.",
});

export const oauthRoutes = Router();

oauthRoutes.get(
  "/:provider/start",
  oauthStartIpRateLimit,
  validate({ params: oauthProviderParamsSchema, query: oauthStartQuerySchema }),
  oauthController.start,
);

oauthRoutes.get(
  "/:provider/callback",
  validate({ params: oauthProviderParamsSchema, query: oauthCallbackQuerySchema }),
  oauthController.callback,
);
