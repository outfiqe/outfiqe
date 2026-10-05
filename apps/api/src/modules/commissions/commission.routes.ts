import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformRole } from "#modules/platform-access/platform-access.middleware.js";
import { requirePlatformNavItem } from "#modules/platform-nav-access/platform-nav-access.middleware.js";

import { commissionController } from "./commission.controller.js";
import {
  commissionIdParamSchema,
  commissionScopeQuerySchema,
  commissionTierIdParamSchema,
  createCommissionTierSchema,
  listAdminCommissionsQuerySchema,
  listCommissionTierHistoryQuerySchema,
  listEarningsQuerySchema,
  testCommissionTierPriceQuerySchema,
  updateCommissionTierSchema,
  voidCommissionSchema,
} from "./commission.schemas.js";

const requireCommissionRead = [
  ...requirePlatformRole("platform:commissions:read", "platform:commissions:manage"),
  requirePlatformNavItem("commissions"),
];
const requireCommissionMutationAdmin = [
  ...requirePlatformRole("platform:commissions:manage"),
  requirePlatformNavItem("commissions"),
];

export const commissionRoutes = Router();

commissionRoutes.get("/me/eligibility", requireAuth, commissionController.getMyEligibility);

commissionRoutes.get("/me/summary", requireAuth, commissionController.getMySummary);

commissionRoutes.get(
  "/me",
  requireAuth,
  validate({ query: listEarningsQuerySchema }),
  commissionController.listMine,
);

commissionRoutes.get("/brand/summary", requireAuth, commissionController.getBrandBuildSummary);

commissionRoutes.get(
  "/brand",
  requireAuth,
  validate({ query: listEarningsQuerySchema }),
  commissionController.listBrandBuildEarnings,
);

commissionRoutes.get(
  "/tiers",
  ...requireCommissionRead,
  validate({ query: commissionScopeQuerySchema }),
  commissionController.listTiers,
);

commissionRoutes.get(
  "/tiers/price-test",
  ...requireCommissionRead,
  validate({ query: testCommissionTierPriceQuerySchema }),
  commissionController.testTierPrice,
);

commissionRoutes.get(
  "/tiers/history",
  ...requireCommissionRead,
  validate({ query: listCommissionTierHistoryQuerySchema }),
  commissionController.listTierHistory,
);

commissionRoutes.post(
  "/tiers",
  ...requireCommissionMutationAdmin,
  validate({ query: commissionScopeQuerySchema, body: createCommissionTierSchema }),
  commissionController.createTier,
);

commissionRoutes.patch(
  "/tiers/:id",
  ...requireCommissionMutationAdmin,
  validate({
    params: commissionTierIdParamSchema,
    query: commissionScopeQuerySchema,
    body: updateCommissionTierSchema,
  }),
  commissionController.updateTier,
);

commissionRoutes.delete(
  "/tiers/:id",
  ...requireCommissionMutationAdmin,
  validate({ params: commissionTierIdParamSchema, query: commissionScopeQuerySchema }),
  commissionController.deleteTier,
);

commissionRoutes.get(
  "/",
  ...requireCommissionRead,
  validate({ query: listAdminCommissionsQuerySchema }),
  commissionController.listAll,
);

commissionRoutes.post(
  "/:id/approve",
  ...requireCommissionMutationAdmin,
  validate({ params: commissionIdParamSchema }),
  commissionController.approve,
);

commissionRoutes.post(
  "/:id/void",
  ...requireCommissionMutationAdmin,
  validate({ params: commissionIdParamSchema, body: voidCommissionSchema }),
  commissionController.void,
);

commissionRoutes.post(
  "/:id/mark-paid",
  ...requireCommissionMutationAdmin,
  validate({ params: commissionIdParamSchema }),
  commissionController.markPaid,
);
