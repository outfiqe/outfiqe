import { Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import { tourController } from "./tour.controller.js";
import { recordTourOutcomeSchema, tourKeyParamSchema } from "./tour.schemas.js";

const MUTATION_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MUTATION_RATE_LIMIT_MAX_REQUESTS = 30;

const mutationRateLimit = rateLimit({
  namespace: "tours-mutation",
  windowMs: MUTATION_RATE_LIMIT_WINDOW_MS,
  max: MUTATION_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
});

export const tourRoutes = Router();

tourRoutes.get("/me", requireAuth, tourController.listMine);

tourRoutes.put(
  "/me/:tourKey",
  requireAuth,
  mutationRateLimit,
  validate({ params: tourKeyParamSchema, body: recordTourOutcomeSchema }),
  tourController.recordMine,
);
