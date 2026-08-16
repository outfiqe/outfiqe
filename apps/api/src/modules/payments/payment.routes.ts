import { Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import { paymentController } from "./payment.controller.js";
import { paymentOrderIdParamSchema } from "./payment.schemas.js";

const INITIATE_WINDOW_MS = 5 * 60 * 1000;
const INITIATE_MAX_REQUESTS = 10;

const initiateRateLimit = rateLimit({
  namespace: "payment-initiate",
  windowMs: INITIATE_WINDOW_MS,
  max: INITIATE_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many payment attempts. Please wait a moment and try again.",
});

export const paymentRoutes = Router();

paymentRoutes.post(
  "/:orderId/initiate",
  requireAuth,
  initiateRateLimit,
  validate({ params: paymentOrderIdParamSchema }),
  paymentController.initiate,
);

paymentRoutes.post(
  "/:orderId/verify",
  requireAuth,
  validate({ params: paymentOrderIdParamSchema }),
  paymentController.verify,
);
