import { Router } from "express";

import { optionalAuth } from "#middlewares/optional-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformRole } from "#modules/platform-access/platform-access.middleware.js";

import { featureFlagsController } from "./feature-flags.controller.js";
import {
  featureFlagKeyParamsSchema,
  updateFeatureFlagBodySchema,
} from "./feature-flags.schemas.js";

export const featureFlagsRoutes = Router();

export const viewerFeatureFlagsRoutes = Router();

const featureFlagsChain = requirePlatformRole("platform:flags:manage");

featureFlagsRoutes.get("/feature-flags", ...featureFlagsChain, featureFlagsController.list);

featureFlagsRoutes.put(
  "/feature-flags/:key",
  ...featureFlagsChain,
  validate({ params: featureFlagKeyParamsSchema, body: updateFeatureFlagBodySchema }),
  featureFlagsController.update,
);

viewerFeatureFlagsRoutes.get("/mine", optionalAuth, featureFlagsController.listMine);
