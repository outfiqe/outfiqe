import type { NextFunction, Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";
import { getResolvedOrganization } from "#modules/crm-access/crm-access.middleware.js";

import type { PlatformFeatureKey } from "./platform-features.registry.js";
import { platformFeaturesService } from "./platform-features.service.js";

export const requireFeature = (key: PlatformFeatureKey) => {
  return async (_req: Request, res: Response, next: NextFunction) => {
    const organization = getResolvedOrganization(res);
    const enabled = await platformFeaturesService.isEnabled(organization.id, key);
    if (!enabled) {
      return next(
        new AppError(
          "FEATURE_NOT_AVAILABLE",
          "This feature isn't enabled for your organization.",
          HTTP_STATUS.FORBIDDEN,
        ),
      );
    }
    next();
  };
};
