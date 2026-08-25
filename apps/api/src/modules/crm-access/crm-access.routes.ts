import { Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import { crmAccessController } from "./crm-access.controller.js";
import { requirePermission } from "./crm-access.middleware.js";
import {
  acceptOrganizationInviteSchema,
  createOrganizationInviteSchema,
  inviteIdParamsSchema,
  membershipIdParamsSchema,
  updateMembershipSchema,
} from "./crm-access.schemas.js";

const CRM_INVITE_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const CRM_INVITE_RATE_LIMIT_MAX_REQUESTS = 20;

const crmInviteRateLimit = rateLimit({
  namespace: "crm-invite",
  windowMs: CRM_INVITE_RATE_LIMIT_WINDOW_MS,
  max: CRM_INVITE_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many invites sent. Please try again later.",
});

export const crmAccessRoutes = Router();

crmAccessRoutes.use(requireAuth);

crmAccessRoutes.get(
  "/organization",
  requirePermission("org:read"),
  crmAccessController.getOrganization,
);

crmAccessRoutes.get("/permissions", crmAccessController.listPermissions);

crmAccessRoutes.get("/roles", requirePermission("roles:read"), crmAccessController.listRoles);

crmAccessRoutes.get("/members", requirePermission("members:read"), crmAccessController.listMembers);
crmAccessRoutes.patch(
  "/members/:membershipId",
  requirePermission("members:manage"),
  validate({ params: membershipIdParamsSchema, body: updateMembershipSchema }),
  crmAccessController.updateMember,
);

crmAccessRoutes.get(
  "/invites",
  requirePermission("members:invite"),
  crmAccessController.listInvites,
);
crmAccessRoutes.post(
  "/invites",
  requirePermission("members:invite"),
  crmInviteRateLimit,
  validate({ body: createOrganizationInviteSchema }),
  crmAccessController.createInvite,
);
crmAccessRoutes.delete(
  "/invites/:inviteId",
  requirePermission("members:invite"),
  validate({ params: inviteIdParamsSchema }),
  crmAccessController.revokeInvite,
);

crmAccessRoutes.post(
  "/invites/accept",
  validate({ body: acceptOrganizationInviteSchema }),
  crmAccessController.acceptInvite,
);
