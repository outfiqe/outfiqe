import { Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";
import { requirePlatformNavItem } from "#modules/platform-nav-access/platform-nav-access.middleware.js";

import { withdrawController } from "./withdraw.controller.js";
import {
  approveWithdrawRequestSchema,
  createWithdrawRequestSchema,
  listAdminWithdrawRequestsQuerySchema,
  listWithdrawRequestsQuerySchema,
  markWithdrawRequestPaidSchema,
  ownerTypeQuerySchema,
  rejectWithdrawRequestSchema,
  updateWithdrawPolicySchema,
  withdrawRequestIdParamSchema,
} from "./withdraw.schemas.js";

const CREATE_WINDOW_MS = 60 * 60 * 1000;
const CREATE_MAX_REQUESTS = 5;

const createWithdrawRequestRateLimit = rateLimit({
  namespace: "withdraw-request-create",
  windowMs: CREATE_WINDOW_MS,
  max: CREATE_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many withdrawal attempts. Please wait a moment and try again.",
});

const requireAdmin = [requireAuth, requirePlatformAccess];
const requireWithdrawRequestsAdmin = [...requireAdmin, requirePlatformNavItem("withdraw-requests")];
const requireWithdrawPolicyAdmin = [...requireAdmin, requirePlatformNavItem("withdraw-policy")];

export const withdrawRoutes = Router();

withdrawRoutes.get(
  "/admin/requests",
  ...requireWithdrawRequestsAdmin,
  validate({ query: listAdminWithdrawRequestsQuerySchema }),
  withdrawController.listAllAdmin,
);

withdrawRoutes.patch(
  "/admin/requests/:id/approve",
  ...requireWithdrawRequestsAdmin,
  validate({ params: withdrawRequestIdParamSchema, body: approveWithdrawRequestSchema }),
  withdrawController.approve,
);

withdrawRoutes.patch(
  "/admin/requests/:id/reject",
  ...requireWithdrawRequestsAdmin,
  validate({ params: withdrawRequestIdParamSchema, body: rejectWithdrawRequestSchema }),
  withdrawController.reject,
);

withdrawRoutes.patch(
  "/admin/requests/:id/mark-paid",
  ...requireWithdrawRequestsAdmin,
  validate({ params: withdrawRequestIdParamSchema, body: markWithdrawRequestPaidSchema }),
  withdrawController.markPaid,
);

withdrawRoutes.put(
  "/admin/policy",
  ...requireWithdrawPolicyAdmin,
  validate({ body: updateWithdrawPolicySchema }),
  withdrawController.updatePolicy,
);

withdrawRoutes.get(
  "/policy",
  requireAuth,
  validate({ query: ownerTypeQuerySchema }),
  withdrawController.getPolicy,
);

withdrawRoutes.get(
  "/eligibility",
  requireAuth,
  validate({ query: ownerTypeQuerySchema }),
  withdrawController.getEligibility,
);

withdrawRoutes.post(
  "/requests",
  requireAuth,
  createWithdrawRequestRateLimit,
  validate({ body: createWithdrawRequestSchema }),
  withdrawController.createRequest,
);

withdrawRoutes.get(
  "/requests",
  requireAuth,
  validate({ query: listWithdrawRequestsQuerySchema }),
  withdrawController.listMine,
);
