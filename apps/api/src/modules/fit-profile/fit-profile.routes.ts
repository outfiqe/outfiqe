import { millisecondsInMinute } from "date-fns/constants";
import { Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import { fitProfileController } from "./fit-profile.controller.js";
import { saveFitProfileSchema } from "./fit-profile.schemas.js";

const MUTATION_RATE_LIMIT_WINDOW_MS = millisecondsInMinute;
const MUTATION_RATE_LIMIT_MAX_REQUESTS = 30;

const mutationRateLimit = rateLimit({
  namespace: "fit-profile-mutation",
  windowMs: MUTATION_RATE_LIMIT_WINDOW_MS,
  max: MUTATION_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
});

export const fitProfileRoutes = Router();

fitProfileRoutes.get("/me", requireAuth, fitProfileController.getMine);

fitProfileRoutes.put(
  "/me",
  requireAuth,
  mutationRateLimit,
  validate({ body: saveFitProfileSchema }),
  fitProfileController.saveMine,
);

fitProfileRoutes.delete("/me", requireAuth, mutationRateLimit, fitProfileController.removeMine);
