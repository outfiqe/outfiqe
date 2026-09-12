import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";
import { requirePlatformRole } from "#modules/platform-access/platform-access.middleware.js";
import { requirePlatformNavItem } from "#modules/platform-nav-access/platform-nav-access.middleware.js";

import { brandPayoutController } from "./brandPayout.controller.js";
import {
  createBrandCommissionExemptionSchema,
  createGatewayFeeRateSchema,
  createPlatformCommissionRuleSchema,
  exemptionIdParamSchema,
  listBrandCommissionExemptionsQuerySchema,
  listBrandPayoutsQuerySchema,
} from "./brandPayout.schemas.js";

const requireAdmin = [
  requireAuth,
  requirePlatformAccess,
  requirePlatformNavItem("platform-commission"),
];
const requireBrandPayoutMutationAdmin = [
  ...requirePlatformRole("platform:commissions:manage"),
  requirePlatformNavItem("platform-commission"),
];

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
  ...requireBrandPayoutMutationAdmin,
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
  ...requireBrandPayoutMutationAdmin,
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
  ...requireBrandPayoutMutationAdmin,
  validate({ body: createBrandCommissionExemptionSchema }),
  brandPayoutController.createExemption,
);

brandPayoutRoutes.patch(
  "/exemptions/:id/revoke",
  ...requireBrandPayoutMutationAdmin,
  validate({ params: exemptionIdParamSchema }),
  brandPayoutController.revokeExemption,
);
