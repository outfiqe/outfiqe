import type { Request, Response } from "express";

import { CrmAuditAction } from "#generated/prisma/enums.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";
import { AUDIT_TARGET_TYPE } from "#modules/crm-audit/crm-audit.constants.js";
import { crmAudit } from "#modules/crm-audit/crm-audit.service.js";
import { buildAuditActor } from "#modules/crm-audit/crm-audit.utils.js";
import { crmBillingService } from "#modules/crm-billing/crm-billing.service.js";
import { platformFeaturesService } from "#modules/platform-features/platform-features.service.js";

import { getCrmMembership, getResolvedOrganization } from "./crm-access.middleware.js";
import type {
  AcceptOrganizationInviteBody,
  CreateOrganizationBody,
  CreateOrganizationInviteBody,
  CreateOwnershipTransferBody,
  CreateRoleBody,
  InviteIdParams,
  MembershipIdParams,
  OwnershipTransferIdParams,
  RoleIdParams,
  SuggestOrganizationQuery,
  UpdateMembershipBody,
  UpdateOrganizationBody,
  UpdateRoleBody,
} from "./crm-access.schemas.js";
import { crmAccessService } from "./crm-access.service.js";
import { toOrganizationWithViewerContext } from "./crm-access.utils.js";

const CREATED_STATUS = 201;

export const crmAccessController = {
  async createOrganization(_req: Request, res: Response) {
    const { name, subdomain, targetOwnerUserId, linkedBrandId } =
      validated.body<CreateOrganizationBody>(res);
    const principal = requireAuthPrincipal(res);

    const organization = await crmAccessService.createOrganization({
      name,
      subdomain,
      creatingUserId: principal.userId,
      targetOwnerUserId,
      linkedBrandId,
    });
    sendSuccess(res, organization, "Organization created.", CREATED_STATUS);
  },

  async suggestOrganization(_req: Request, res: Response) {
    const { brandId } = validated.query<SuggestOrganizationQuery>(res);

    const suggestion = await crmAccessService.suggestOrganizationFromBrand(brandId);
    sendSuccess(res, suggestion, "Organization creation suggestion.");
  },

  async listOrganizations(_req: Request, res: Response) {
    const organizations = await crmAccessService.listOrganizations();
    sendSuccess(res, organizations, "Organizations.");
  },

  async getOrganization(_req: Request, res: Response) {
    const organization = getResolvedOrganization(res);
    const membership = getCrmMembership(res);
    const [pendingOwnershipTransfer, advancedFeaturesEnabled, features] = await Promise.all([
      crmAccessService.getPendingOwnershipTransfer(organization.id),
      crmBillingService.resolveAdvancedFeaturesForOrganization(organization),
      platformFeaturesService.featureMap(organization.id),
    ]);
    sendSuccess(
      res,
      toOrganizationWithViewerContext(
        organization,
        membership,
        pendingOwnershipTransfer,
        advancedFeaturesEnabled,
        features,
      ),
      "CRM organization.",
    );
  },

  async listPermissions(_req: Request, res: Response) {
    const permissions = await crmAccessService.listPermissions();
    sendSuccess(res, permissions, "CRM permission catalog.");
  },

  async listRoles(_req: Request, res: Response) {
    const organization = getResolvedOrganization(res);
    const roles = await crmAccessService.listRoles(organization.id);
    sendSuccess(res, roles, "CRM roles.");
  },

  async createRole(req: Request, res: Response) {
    const { name, permissionKeys } = validated.body<CreateRoleBody>(res);
    const organization = getResolvedOrganization(res);

    const role = await crmAccessService.createRole(organization.id, { name, permissionKeys });
    await crmAudit.record({
      organizationId: organization.id,
      action: CrmAuditAction.ROLE_CREATED,
      summary: `Created role "${role.name}"`,
      actor: buildAuditActor(req, res),
      target: { type: AUDIT_TARGET_TYPE.ROLE, id: role.id },
      metadata: { permissionCount: role.permissionKeys.length },
    });
    sendSuccess(res, role, "Role created.", CREATED_STATUS);
  },

  async updateRole(req: Request, res: Response) {
    const { roleId } = validated.params<RoleIdParams>(res);
    const body = validated.body<UpdateRoleBody>(res);
    const organization = getResolvedOrganization(res);

    const role = await crmAccessService.updateRole(organization.id, roleId, body);
    await crmAudit.record({
      organizationId: organization.id,
      action: CrmAuditAction.ROLE_UPDATED,
      summary: `Updated role "${role.name}"`,
      actor: buildAuditActor(req, res),
      target: { type: AUDIT_TARGET_TYPE.ROLE, id: role.id },
      metadata: {
        renamed: body.name !== undefined,
        permissionsChanged: body.permissionKeys !== undefined,
      },
    });
    sendSuccess(res, role, "Role updated.");
  },

  async deleteRole(req: Request, res: Response) {
    const { roleId } = validated.params<RoleIdParams>(res);
    const organization = getResolvedOrganization(res);

    await crmAccessService.deleteRole(organization.id, roleId);
    await crmAudit.record({
      organizationId: organization.id,
      action: CrmAuditAction.ROLE_DELETED,
      summary: "Deleted a custom role",
      actor: buildAuditActor(req, res),
      target: { type: AUDIT_TARGET_TYPE.ROLE, id: roleId },
    });
    sendSuccess(res, null, "Role deleted.");
  },

  async updateOrganization(req: Request, res: Response) {
    const { name } = validated.body<UpdateOrganizationBody>(res);
    const organization = getResolvedOrganization(res);

    const updated = await crmAccessService.updateOrganization(organization, { name });
    await crmAudit.record({
      organizationId: organization.id,
      action: CrmAuditAction.ORGANIZATION_RENAMED,
      summary: `Renamed the organization to "${updated.name}"`,
      actor: buildAuditActor(req, res),
      target: { type: AUDIT_TARGET_TYPE.ORGANIZATION, id: organization.id },
      metadata: { previousName: organization.name },
    });
    sendSuccess(res, updated, "Organization updated.");
  },

  async listMembers(_req: Request, res: Response) {
    const organization = getResolvedOrganization(res);
    const members = await crmAccessService.listMembers(organization);
    sendSuccess(res, members, "CRM members.");
  },

  async updateMember(req: Request, res: Response) {
    const { membershipId } = validated.params<MembershipIdParams>(res);
    const body = validated.body<UpdateMembershipBody>(res);
    const organization = getResolvedOrganization(res);

    const membership = await crmAccessService.updateMembership(organization, membershipId, body);
    await crmAudit.record({
      organizationId: organization.id,
      action:
        body.roleId !== undefined
          ? CrmAuditAction.MEMBER_ROLE_CHANGED
          : CrmAuditAction.MEMBER_STATUS_CHANGED,
      summary:
        body.roleId !== undefined
          ? "Changed a member's role"
          : `Set a member's status to ${body.status}`,
      actor: buildAuditActor(req, res),
      target: { type: AUDIT_TARGET_TYPE.MEMBERSHIP, id: membershipId },
      metadata: { ...(body.status ? { status: body.status } : {}) },
    });
    sendSuccess(res, membership, "Member updated.");
  },

  async listInvites(_req: Request, res: Response) {
    const organization = getResolvedOrganization(res);
    const invites = await crmAccessService.listInvites(organization.id);
    sendSuccess(res, invites, "Pending CRM invites.");
  },

  async createInvite(req: Request, res: Response) {
    const { email, roleId } = validated.body<CreateOrganizationInviteBody>(res);
    const principal = requireAuthPrincipal(res);
    const organization = getResolvedOrganization(res);

    await crmAccessService.inviteMember(organization, email, roleId, principal.userId);
    await crmAudit.record({
      organizationId: organization.id,
      action: CrmAuditAction.INVITE_SENT,
      summary: `Invited ${email}`,
      actor: buildAuditActor(req, res),
      target: { type: AUDIT_TARGET_TYPE.INVITE, id: null },
      metadata: { email, roleId },
    });
    sendSuccess(res, null, "Invite sent.", CREATED_STATUS);
  },

  async revokeInvite(req: Request, res: Response) {
    const { inviteId } = validated.params<InviteIdParams>(res);
    const organization = getResolvedOrganization(res);

    await crmAccessService.revokeInvite(organization.id, inviteId);
    await crmAudit.record({
      organizationId: organization.id,
      action: CrmAuditAction.INVITE_REVOKED,
      summary: "Revoked a pending invite",
      actor: buildAuditActor(req, res),
      target: { type: AUDIT_TARGET_TYPE.INVITE, id: inviteId },
    });
    sendSuccess(res, null, "Invite revoked.");
  },

  async acceptInvite(req: Request, res: Response) {
    const { token } = validated.body<AcceptOrganizationInviteBody>(res);
    const principal = requireAuthPrincipal(res);

    const membership = await crmAccessService.acceptInvite(token, principal.userId);
    await crmAudit.record({
      organizationId: membership.organizationId,
      action: CrmAuditAction.INVITE_ACCEPTED,
      summary: "Accepted a CRM invite",
      actor: {
        actorUserId: principal.userId,
        actorMembershipId: membership.id,
        ipAddress: req.ip ?? null,
      },
      target: { type: AUDIT_TARGET_TYPE.MEMBERSHIP, id: membership.id },
    });
    sendSuccess(res, membership, "CRM access granted.", CREATED_STATUS);
  },

  async createOwnershipTransfer(req: Request, res: Response) {
    const { toMembershipId, removeSenderMembership } =
      validated.body<CreateOwnershipTransferBody>(res);
    const organization = getResolvedOrganization(res);
    const membership = getCrmMembership(res);

    await crmAccessService.createOwnershipTransfer(
      organization,
      membership.id,
      toMembershipId,
      removeSenderMembership,
    );
    await crmAudit.record({
      organizationId: organization.id,
      action: CrmAuditAction.OWNERSHIP_TRANSFER_REQUESTED,
      summary: "Requested an ownership transfer",
      actor: buildAuditActor(req, res),
      target: { type: AUDIT_TARGET_TYPE.OWNERSHIP_TRANSFER, id: toMembershipId },
      metadata: { removeSenderMembership },
    });
    sendSuccess(res, null, "Ownership transfer requested.", CREATED_STATUS);
  },

  async acceptOwnershipTransfer(req: Request, res: Response) {
    const { requestId } = validated.params<OwnershipTransferIdParams>(res);
    const organization = getResolvedOrganization(res);
    const principal = requireAuthPrincipal(res);

    await crmAccessService.acceptOwnershipTransfer(organization, requestId, principal.userId);
    await crmAudit.record({
      organizationId: organization.id,
      action: CrmAuditAction.OWNERSHIP_TRANSFER_ACCEPTED,
      summary: "Accepted an ownership transfer",
      actor: { actorUserId: principal.userId, actorMembershipId: null, ipAddress: req.ip ?? null },
      target: { type: AUDIT_TARGET_TYPE.OWNERSHIP_TRANSFER, id: requestId },
    });
    sendSuccess(res, null, "Ownership transfer accepted.");
  },

  async declineOwnershipTransfer(req: Request, res: Response) {
    const { requestId } = validated.params<OwnershipTransferIdParams>(res);
    const organization = getResolvedOrganization(res);
    const principal = requireAuthPrincipal(res);

    await crmAccessService.declineOwnershipTransfer(organization, requestId, principal.userId);
    await crmAudit.record({
      organizationId: organization.id,
      action: CrmAuditAction.OWNERSHIP_TRANSFER_DECLINED,
      summary: "Declined an ownership transfer",
      actor: { actorUserId: principal.userId, actorMembershipId: null, ipAddress: req.ip ?? null },
      target: { type: AUDIT_TARGET_TYPE.OWNERSHIP_TRANSFER, id: requestId },
    });
    sendSuccess(res, null, "Ownership transfer declined.");
  },

  async revokeOwnershipTransfer(req: Request, res: Response) {
    const { requestId } = validated.params<OwnershipTransferIdParams>(res);
    const organization = getResolvedOrganization(res);

    await crmAccessService.revokeOwnershipTransfer(organization, requestId);
    await crmAudit.record({
      organizationId: organization.id,
      action: CrmAuditAction.OWNERSHIP_TRANSFER_REVOKED,
      summary: "Revoked a pending ownership transfer",
      actor: buildAuditActor(req, res),
      target: { type: AUDIT_TARGET_TYPE.OWNERSHIP_TRANSFER, id: requestId },
    });
    sendSuccess(res, null, "Ownership transfer revoked.");
  },
};
