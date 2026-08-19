import { Router } from "express";

import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import { xpController } from "./xp.controller.js";
import { listXpTransactionsQuerySchema } from "./xp.schemas.js";

export const xpRoutes = Router();

xpRoutes.get("/me", requireAuth, xpController.getMyProgress);

xpRoutes.get(
  "/me/transactions",
  requireAuth,
  validate({ query: listXpTransactionsQuerySchema }),
  xpController.listMyTransactions,
);
