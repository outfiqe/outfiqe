import { Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import { addressController } from "./address.controller.js";
import {
  addressIdParamSchema,
  createAddressSchema,
  updateAddressSchema,
} from "./address.schemas.js";

const WRITE_WINDOW_MS = 60 * 60 * 1000;
const WRITE_MAX_REQUESTS = 30;

const writeRateLimit = rateLimit({
  namespace: "saved-address-write",
  windowMs: WRITE_WINDOW_MS,
  max: WRITE_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many address changes. Please wait a moment and try again.",
});

export const addressRoutes = Router();

addressRoutes.get("/", requireAuth, addressController.list);

addressRoutes.post(
  "/",
  requireAuth,
  writeRateLimit,
  validate({ body: createAddressSchema }),
  addressController.create,
);

addressRoutes.patch(
  "/:id",
  requireAuth,
  writeRateLimit,
  validate({ params: addressIdParamSchema, body: updateAddressSchema }),
  addressController.update,
);

addressRoutes.delete(
  "/:id",
  requireAuth,
  writeRateLimit,
  validate({ params: addressIdParamSchema }),
  addressController.remove,
);

addressRoutes.patch(
  "/:id/default",
  requireAuth,
  writeRateLimit,
  validate({ params: addressIdParamSchema }),
  addressController.setDefault,
);
