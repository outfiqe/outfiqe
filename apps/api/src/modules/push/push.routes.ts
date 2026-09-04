import { Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import {
  PUSH_WRITE_RATE_LIMIT_MAX_REQUESTS,
  PUSH_WRITE_RATE_LIMIT_WINDOW_MS,
} from "./push.constants.js";
import { pushController } from "./push.controller.js";
import { removePushSubscriptionSchema, savePushSubscriptionSchema } from "./push.schemas.js";

const pushWriteRateLimit = rateLimit({
  namespace: "push-write",
  windowMs: PUSH_WRITE_RATE_LIMIT_WINDOW_MS,
  max: PUSH_WRITE_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many push subscription changes in a short time. Please slow down.",
});

export const pushRoutes = Router();

pushRoutes.get("/public-key", pushController.getPublicKey);

pushRoutes.post(
  "/subscriptions",
  requireAuth,
  pushWriteRateLimit,
  validate({ body: savePushSubscriptionSchema }),
  pushController.saveSubscription,
);

pushRoutes.delete(
  "/subscriptions",
  requireAuth,
  pushWriteRateLimit,
  validate({ body: removePushSubscriptionSchema }),
  pushController.removeSubscription,
);
