import type { NextFunction, Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";
import { getAuthPrincipal } from "#middlewares/require-auth.js";

import type { FeatureFlagKey } from "./feature-flags.registry.js";
import { featureFlagsService } from "./feature-flags.service.js";

export const requireFeatureFlag =
  (key: FeatureFlagKey) => async (_req: Request, res: Response, next: NextFunction) => {
    const userId = getAuthPrincipal(res)?.userId ?? null;
    if (await featureFlagsService.isEnabledForUser(key, userId)) return next();
    next(new AppError("FEATURE_NOT_AVAILABLE", "Not found.", HTTP_STATUS.NOT_FOUND));
  };
