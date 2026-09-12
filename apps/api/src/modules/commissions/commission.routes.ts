import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";
import { requirePlatformRole } from "#modules/platform-access/platform-access.middleware.js";
import { requirePlatformNavItem } from "#modules/platform-nav-access/platform-nav-access.middleware.js";

import { commissionController } from "./commission.controller.js";
import {
  commissionIdParamSchema,
  commissionTierIdParamSchema,
  createCommissionTierSchema,
  listAdminCommissionsQuerySchema,
  listEarningsQuerySchema,
  updateCommissionTierSchema,
  voidCommissionSchema,
} from "./commission.schemas.js";

const requireAdmin = [requireAuth, requirePlatformAccess, requirePlatformNavItem("commissions")];
const requireCommissionMutationAdmin = [
  ...requirePlatformRole("platform:commissions:manage"),
  requirePlatformNavItem("commissions"),
];

export const commissionRoutes = Router();

commissionRoutes.get("/me/summary", requireAuth, commissionController.getMySummary);

commissionRoutes.get(
  "/me",
  requireAuth,
  validate({ query: listEarningsQuerySchema }),
  commissionController.listMine,
);

commissionRoutes.get("/tiers", ...requireAdmin, commissionController.listTiers);

commissionRoutes.post(
  "/tiers",
  ...requireCommissionMutationAdmin,
  validate({ body: createCommissionTierSchema }),
  commissionController.createTier,
);

commissionRoutes.patch(
  "/tiers/:id",
  ...requireCommissionMutationAdmin,
  validate({ params: commissionTierIdParamSchema, body: updateCommissionTierSchema }),
  commissionController.updateTier,
);

commissionRoutes.delete(
  "/tiers/:id",
  ...requireCommissionMutationAdmin,
  validate({ params: commissionTierIdParamSchema }),
  commissionController.deleteTier,
);

commissionRoutes.get(
  "/",
  ...requireAdmin,
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
