import { Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import { orderController } from "./order.controller.js";
import { checkoutBodySchema, listOrdersQuerySchema, orderIdParamSchema } from "./order.schemas.js";

const CHECKOUT_WINDOW_MS = 5 * 60 * 1000;
const CHECKOUT_MAX_REQUESTS = 10;

const checkoutRateLimit = rateLimit({
  namespace: "checkout",
  windowMs: CHECKOUT_WINDOW_MS,
  max: CHECKOUT_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many checkout attempts. Please wait a moment and try again.",
});

export const orderRoutes = Router();

orderRoutes.post(
  "/checkout",
  requireAuth,
  checkoutRateLimit,
  validate({ body: checkoutBodySchema }),
  orderController.checkout,
);

orderRoutes.get("/", requireAuth, validate({ query: listOrdersQuerySchema }), orderController.list);

orderRoutes.get(
  "/:orderId",
  requireAuth,
  validate({ params: orderIdParamSchema }),
  orderController.get,
);
