import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";

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

const requireAdmin = [requireAuth, requireRole(UserRole.ADMIN)];

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
  ...requireAdmin,
  validate({ body: createCommissionTierSchema }),
  commissionController.createTier,
);

commissionRoutes.patch(
  "/tiers/:id",
  ...requireAdmin,
  validate({ params: commissionTierIdParamSchema, body: updateCommissionTierSchema }),
  commissionController.updateTier,
);

commissionRoutes.delete(
  "/tiers/:id",
  ...requireAdmin,
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
  ...requireAdmin,
  validate({ params: commissionIdParamSchema }),
  commissionController.approve,
);

commissionRoutes.post(
  "/:id/void",
  ...requireAdmin,
  validate({ params: commissionIdParamSchema, body: voidCommissionSchema }),
  commissionController.void,
);

commissionRoutes.post(
  "/:id/mark-paid",
  ...requireAdmin,
  validate({ params: commissionIdParamSchema }),
  commissionController.markPaid,
);
