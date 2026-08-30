import type { NextFunction, Request, Response } from "express";

import { AppError } from "#middlewares/error-handler.js";
import { getResolvedOrganization } from "#modules/crm-access/crm-access.middleware.js";

import { crmBillingService } from "./crm-billing.service.js";

const PAYMENT_REQUIRED_STATUS = 402;

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
        PAYMENT_REQUIRED_STATUS,
      ),
    );
  }

  next();
};
