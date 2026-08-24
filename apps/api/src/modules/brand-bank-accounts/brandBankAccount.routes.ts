import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { bankAccountBodySchema, bankAccountIdParamSchema } from "#lib/bank-account-body.schemas.js";
import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";

import { brandBankAccountController } from "./brandBankAccount.controller.js";

const CREATE_WINDOW_MS = 60 * 60 * 1000;
const CREATE_MAX_REQUESTS = 10;

const createBrandBankAccountRateLimit = rateLimit({
  namespace: "brand-bank-account-create",
  windowMs: CREATE_WINDOW_MS,
  max: CREATE_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many bank account changes. Please wait a moment and try again.",
});

const requireAdmin = [requireAuth, requireRole(UserRole.ADMIN)];

export const brandBankAccountRoutes = Router();

brandBankAccountRoutes.post(
  "/",
  requireAuth,
  createBrandBankAccountRateLimit,
  validate({ body: bankAccountBodySchema }),
  brandBankAccountController.create,
);

brandBankAccountRoutes.get("/", requireAuth, brandBankAccountController.list);

brandBankAccountRoutes.patch(
  "/:id/default",
  requireAuth,
  validate({ params: bankAccountIdParamSchema }),
  brandBankAccountController.setDefault,
);

brandBankAccountRoutes.patch(
  "/:id/verify",
  ...requireAdmin,
  validate({ params: bankAccountIdParamSchema }),
  brandBankAccountController.verify,
);

brandBankAccountRoutes.get(
  "/:id/reveal",
  ...requireAdmin,
  validate({ params: bankAccountIdParamSchema }),
  brandBankAccountController.reveal,
);
