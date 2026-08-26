import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";

import { brandPayoutController } from "./brandPayout.controller.js";
import {
  createBrandCommissionExemptionSchema,
  createGatewayFeeRateSchema,
  createPlatformCommissionRuleSchema,
  exemptionIdParamSchema,
  listBrandCommissionExemptionsQuerySchema,
  listBrandPayoutsQuerySchema,
} from "./brandPayout.schemas.js";

const requireAdmin = [requireAuth, requirePlatformAccess];

export const brandPayoutRoutes = Router();

brandPayoutRoutes.get("/me/summary", requireAuth, brandPayoutController.getMySummary);

brandPayoutRoutes.get(
  "/me",
  requireAuth,
  validate({ query: listBrandPayoutsQuerySchema }),
  brandPayoutController.listMine,
);

brandPayoutRoutes.get("/commission-rules", ...requireAdmin, brandPayoutController.listRules);

brandPayoutRoutes.post(
  "/commission-rules",
  ...requireAdmin,
  validate({ body: createPlatformCommissionRuleSchema }),
  brandPayoutController.createRule,
);

brandPayoutRoutes.get(
  "/gateway-fee-rates",
  ...requireAdmin,
  brandPayoutController.listGatewayFeeRates,
);

brandPayoutRoutes.post(
  "/gateway-fee-rates",
  ...requireAdmin,
  validate({ body: createGatewayFeeRateSchema }),
  brandPayoutController.createGatewayFeeRate,
);

brandPayoutRoutes.get(
  "/exemptions",
  ...requireAdmin,
  validate({ query: listBrandCommissionExemptionsQuerySchema }),
  brandPayoutController.listExemptions,
);

brandPayoutRoutes.post(
  "/exemptions",
  ...requireAdmin,
  validate({ body: createBrandCommissionExemptionSchema }),
  brandPayoutController.createExemption,
);

brandPayoutRoutes.patch(
  "/exemptions/:id/revoke",
  ...requireAdmin,
  validate({ params: exemptionIdParamSchema }),
  brandPayoutController.revokeExemption,
);
