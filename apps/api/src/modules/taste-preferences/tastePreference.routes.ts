import { Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

import { tastePreferenceController } from "./tastePreference.controller.js";
import { setTastePreferenceSchema } from "./tastePreference.schemas.js";

const MUTATION_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MUTATION_RATE_LIMIT_MAX_REQUESTS = 30;

const mutationRateLimit = rateLimit({
  namespace: "taste-preferences-mutation",
  windowMs: MUTATION_RATE_LIMIT_WINDOW_MS,
  max: MUTATION_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
});

export const tastePreferenceRoutes = Router();

tastePreferenceRoutes.get("/me", requireAuth, tastePreferenceController.getMine);

tastePreferenceRoutes.put(
  "/me",
  requireAuth,
  mutationRateLimit,
  validate({ body: setTastePreferenceSchema }),
  tastePreferenceController.setMine,
);

tastePreferenceRoutes.delete(
  "/me",
  requireAuth,
  mutationRateLimit,
  tastePreferenceController.clearMine,
);

tastePreferenceRoutes.get(
  "/popularity",
  ...platformGuards.catalogRead,
  tastePreferenceController.listPopularity,
);
