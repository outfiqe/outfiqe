import { Router } from "express";

import { validate } from "#middlewares/validate.js";
import { requirePlatformRole } from "#modules/platform-access/platform-access.middleware.js";
import { requirePlatformNavItem } from "#modules/platform-nav-access/platform-nav-access.middleware.js";

import { platformFeaturesController } from "./platform-features.controller.js";
import {
  featureKeyParamsSchema,
  orgIdParamsSchema,
  setOverrideBodySchema,
} from "./platform-features.schemas.js";

export const platformFeaturesRoutes = Router();

const featuresChain = [
  ...requirePlatformRole("platform:features:manage"),
  requirePlatformNavItem("platform-features"),
];

platformFeaturesRoutes.get(
  "/features/registry",
  ...featuresChain,
  platformFeaturesController.getRegistry,
);

platformFeaturesRoutes.get(
  "/features/tenants/:orgId",
  ...featuresChain,
  validate({ params: orgIdParamsSchema }),
  platformFeaturesController.getTenantFeatures,
);

platformFeaturesRoutes.put(
  "/features/tenants/:orgId/:key",
  ...featuresChain,
  validate({ params: featureKeyParamsSchema, body: setOverrideBodySchema }),
  platformFeaturesController.setOverride,
);

platformFeaturesRoutes.delete(
  "/features/tenants/:orgId/:key",
  ...featuresChain,
  validate({ params: featureKeyParamsSchema }),
  platformFeaturesController.clearOverride,
);
