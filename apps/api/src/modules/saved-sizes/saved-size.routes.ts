import { Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import { savedSizeController } from "./saved-size.controller.js";
import { productTypeIdParamsSchema, saveSizeBodySchema } from "./saved-size.schemas.js";

const MUTATION_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MUTATION_RATE_LIMIT_MAX_REQUESTS = 30;

const mutationRateLimit = rateLimit({
  namespace: "saved-sizes-mutation",
  windowMs: MUTATION_RATE_LIMIT_WINDOW_MS,
  max: MUTATION_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
});

export const savedSizeRoutes = Router();

savedSizeRoutes.get("/me", requireAuth, savedSizeController.listMine);

savedSizeRoutes.put(
  "/me/:productTypeId",
  requireAuth,
  mutationRateLimit,
  validate({ params: productTypeIdParamsSchema, body: saveSizeBodySchema }),
  savedSizeController.saveMine,
);

savedSizeRoutes.delete(
  "/me/:productTypeId",
  requireAuth,
  mutationRateLimit,
  validate({ params: productTypeIdParamsSchema }),
  savedSizeController.removeMine,
);
