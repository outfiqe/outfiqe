import { Router } from "express";

import { UserRole } from "#generated/prisma/enums.js";
import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { requireRole } from "#middlewares/require-role.js";
import { validate } from "#middlewares/validate.js";

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

const requireAdmin = [requireAuth, requireRole(UserRole.ADMIN)];

export const withdrawRoutes = Router();

withdrawRoutes.get(
  "/admin/requests",
  ...requireAdmin,
  validate({ query: listAdminWithdrawRequestsQuerySchema }),
  withdrawController.listAllAdmin,
);

withdrawRoutes.patch(
  "/admin/requests/:id/approve",
  ...requireAdmin,
  validate({ params: withdrawRequestIdParamSchema, body: approveWithdrawRequestSchema }),
  withdrawController.approve,
);

withdrawRoutes.patch(
  "/admin/requests/:id/reject",
  ...requireAdmin,
  validate({ params: withdrawRequestIdParamSchema, body: rejectWithdrawRequestSchema }),
  withdrawController.reject,
);

withdrawRoutes.patch(
  "/admin/requests/:id/mark-paid",
  ...requireAdmin,
  validate({ params: withdrawRequestIdParamSchema, body: markWithdrawRequestPaidSchema }),
  withdrawController.markPaid,
);

withdrawRoutes.put(
  "/admin/policy",
  ...requireAdmin,
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
