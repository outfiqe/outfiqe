import { Router } from "express";

import {
  bankAccountBodySchema,
  bankAccountIdParamSchema,
  listAdminBankAccountsQuerySchema,
} from "#lib/bank-account-body.schemas.js";
import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { platformGuards } from "#modules/platform-access/platform-access.guards.js";

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
  ...platformGuards.withdrawManage,
  validate({ params: bankAccountIdParamSchema }),
  brandBankAccountController.verify,
);

brandBankAccountRoutes.get(
  "/:id/reveal",
  ...platformGuards.withdrawManage,
  validate({ params: bankAccountIdParamSchema }),
  brandBankAccountController.reveal,
);

brandBankAccountRoutes.get(
  "/admin",
  ...platformGuards.withdrawRead,
  validate({ query: listAdminBankAccountsQuerySchema }),
  brandBankAccountController.listAllAdmin,
);
