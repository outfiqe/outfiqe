import type { NextFunction, Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";
import { getResolvedOrganization } from "#modules/crm-access/crm-access.middleware.js";

import { crmBillingService } from "./crm-billing.service.js";

export const requireAdvancedCrmFeatures = async (
  _req: Request,
  res: Response,
  next: NextFunction,
) => {
  const organization = getResolvedOrganization(res);
  const enabled = await crmBillingService.resolveAdvancedFeaturesForOrganization(organization);

  if (!enabled) {
    return next(
      new AppError(
        "ADVANCED_FEATURES_LOCKED",
        "This feature needs an active CRM subscription. Your trial has ended.",
        HTTP_STATUS.PAYMENT_REQUIRED,
      ),
    );
  }

  next();
};
