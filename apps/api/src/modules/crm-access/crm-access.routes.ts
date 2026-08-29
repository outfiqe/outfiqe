import { Router } from "express";

import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import {
  CRM_INVITE_RATE_LIMIT_MAX_REQUESTS,
  CRM_INVITE_RATE_LIMIT_WINDOW_MS,
  CRM_ORGANIZATION_RATE_LIMIT_MAX_REQUESTS,
  CRM_ORGANIZATION_RATE_LIMIT_WINDOW_MS,
  CRM_OWNERSHIP_TRANSFER_RATE_LIMIT_MAX_REQUESTS,
  CRM_OWNERSHIP_TRANSFER_RATE_LIMIT_WINDOW_MS,
} from "./crm-access.constants.js";
import { crmAccessController } from "./crm-access.controller.js";
import {
  requirePermission,
  requirePlatformAccess,
  resolveTenant,
} from "./crm-access.middleware.js";
import {
  acceptOrganizationInviteSchema,
  createOrganizationInviteSchema,
  createOrganizationSchema,
  createOwnershipTransferSchema,
  inviteIdParamsSchema,
  membershipIdParamsSchema,
  ownershipTransferIdParamsSchema,
  suggestOrganizationQuerySchema,
  updateMembershipSchema,
} from "./crm-access.schemas.js";

const crmInviteRateLimit = rateLimit({
  namespace: "crm-invite",
  windowMs: CRM_INVITE_RATE_LIMIT_WINDOW_MS,
  max: CRM_INVITE_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many invites sent. Please try again later.",
});

const crmOrganizationRateLimit = rateLimit({
  namespace: "crm-organization-create",
  windowMs: CRM_ORGANIZATION_RATE_LIMIT_WINDOW_MS,
  max: CRM_ORGANIZATION_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many organizations created. Please try again later.",
});

const crmOwnershipTransferRateLimit = rateLimit({
  namespace: "crm-ownership-transfer",
  windowMs: CRM_OWNERSHIP_TRANSFER_RATE_LIMIT_WINDOW_MS,
  max: CRM_OWNERSHIP_TRANSFER_RATE_LIMIT_MAX_REQUESTS,
  keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  message: "Too many ownership transfers requested. Please try again later.",
});

export const crmAccessRoutes = Router();

crmAccessRoutes.get(
  "/organizations",
  requireAuth,
  requirePlatformAccess,
  crmAccessController.listOrganizations,
);
crmAccessRoutes.get(
  "/organizations/suggest",
  requireAuth,
  requirePlatformAccess,
  validate({ query: suggestOrganizationQuerySchema }),
  crmAccessController.suggestOrganization,
);
crmAccessRoutes.post(
  "/organizations",
  requireAuth,
  requirePlatformAccess,
  crmOrganizationRateLimit,
  validate({ body: createOrganizationSchema }),
  crmAccessController.createOrganization,
);

crmAccessRoutes.use(resolveTenant, requireAuth);

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

crmAccessRoutes.post(
  "/ownership-transfer",
  requirePermission("org:transfer_ownership"),
  crmOwnershipTransferRateLimit,
  validate({ body: createOwnershipTransferSchema }),
  crmAccessController.createOwnershipTransfer,
);
crmAccessRoutes.post(
  "/ownership-transfer/:requestId/accept",
  validate({ params: ownershipTransferIdParamsSchema }),
  crmAccessController.acceptOwnershipTransfer,
);
crmAccessRoutes.post(
  "/ownership-transfer/:requestId/decline",
  validate({ params: ownershipTransferIdParamsSchema }),
  crmAccessController.declineOwnershipTransfer,
);
crmAccessRoutes.delete(
  "/ownership-transfer/:requestId",
  requirePermission("org:transfer_ownership"),
  validate({ params: ownershipTransferIdParamsSchema }),
  crmAccessController.revokeOwnershipTransfer,
);
