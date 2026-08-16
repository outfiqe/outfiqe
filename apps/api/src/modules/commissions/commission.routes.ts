import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import { commissionController } from "./commission.controller.js";
import { listEarningsQuerySchema } from "./commission.schemas.js";

export const commissionRoutes = Router();

commissionRoutes.get("/me/summary", requireAuth, commissionController.getMySummary);

commissionRoutes.get(
  "/me",
  requireAuth,
  validate({ query: listEarningsQuerySchema }),
  commissionController.listMine,
);
