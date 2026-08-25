import { env } from "#config/env.config.js";
import { crmOrganizationInviteTemplate } from "#email-templates/templates.js";
import { type MembershipStatus, UserRole } from "#generated/prisma/enums.js";
import { sendEmail } from "#lib/email.utils.js";
import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";
import { isUniqueConstraintError } from "#lib/prisma.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { userRepository } from "#modules/users/user.repository.js";

import { ORGANIZATION_INVITE_TTL_MS } from "./crm-access.constants.js";
import { crmAccessRepository } from "./crm-access.repository.js";
import type {
  MembershipRecord,
  MembershipSummary,
  OrganizationInviteSummary,
  OrganizationRecord,
  PermissionRecord,
  RoleWithPermissions,
} from "./crm-access.types.js";
import { toInviteSummary, toMembershipSummary } from "./crm-access.utils.js";

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;
const FORBIDDEN_STATUS = 403;

export const crmAccessService = {
  async listPermissions(): Promise<PermissionRecord[]> {
    return crmAccessRepository.listPermissions();
  },

  async listRoles(organizationId: string): Promise<RoleWithPermissions[]> {
    return crmAccessRepository.listRoles(organizationId);
  },

  async listMembers(organization: OrganizationRecord): Promise<MembershipSummary[]> {
    const memberships = await crmAccessRepository.listMemberships(organization.id);
    return memberships.map((membership) =>
      toMembershipSummary(membership, organization.superAdminMembershipId),
    );
  },

  async updateMembership(
    organization: OrganizationRecord,
    membershipId: string,
    data: { roleId?: string; status?: MembershipStatus },
  ): Promise<MembershipRecord> {
    if (organization.superAdminMembershipId === membershipId) {
      throw new AppError(
        "SUPERADMIN_MEMBERSHIP_LOCKED",
        "The SUPERADMIN membership can't be edited this way. Use ownership transfer instead.",
        FORBIDDEN_STATUS,
      );
    }

    const membership = await crmAccessRepository.findMembershipById(organization.id, membershipId);
    if (!membership) {
      throw new AppError("MEMBERSHIP_NOT_FOUND", "Member not found.", NOT_FOUND_STATUS);
    }

    if (data.roleId) {
      const role = await crmAccessRepository.findRoleById(organization.id, data.roleId);
      if (!role) {
        throw new AppError("ROLE_NOT_FOUND", "Role not found.", NOT_FOUND_STATUS);
      }
    }

    return crmAccessRepository.updateMembership(organization.id, membershipId, data);
  },

  async listInvites(organizationId: string): Promise<OrganizationInviteSummary[]> {
    const invites = await crmAccessRepository.listInvites(organizationId);
    return invites.map(toInviteSummary);
  },

  async inviteMember(
    organization: OrganizationRecord,
    email: string,
    roleId: string,
    invitedById: string,
  ): Promise<void> {
    const role = await crmAccessRepository.findRoleById(organization.id, roleId);
    if (!role) {
      throw new AppError("ROLE_NOT_FOUND", "Role not found.", NOT_FOUND_STATUS);
    }

    const invitedUser = await userRepository.findByEmail(email);
    if (!invitedUser || invitedUser.role !== UserRole.ADMIN) {
      throw new AppError(
        "STAFF_ACCOUNT_NOT_FOUND",
        "This email doesn't match an existing Outfiqe staff account.",
        NOT_FOUND_STATUS,
      );
    }

    const existingMembership = await crmAccessRepository.findMembershipByUserAndOrg(
      invitedUser.id,
      organization.id,
    );
    if (existingMembership) {
      throw new AppError("MEMBER_EXISTS", "This person already has CRM access.", CONFLICT_STATUS);
    }

    const pendingInvite = await crmAccessRepository.findPendingInviteByEmail(
      organization.id,
      email,
    );
    if (pendingInvite) {
      throw new AppError(
        "INVITE_ALREADY_PENDING",
        "An invite is already pending for this email.",
        CONFLICT_STATUS,
      );
    }

    const rawToken = generateOpaqueToken();
    await crmAccessRepository.createInvite({
      organizationId: organization.id,
      email,
      roleId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + ORGANIZATION_INVITE_TTL_MS),
      invitedById,
    });

    const inviteUrl = `${env.ADMIN_URL}/crm/invites/accept?token=${rawToken}`;
    const { subject, html } = crmOrganizationInviteTemplate(role.name, inviteUrl);

    await sendEmail({
      to: email,
      subject,
      body: `You've been invited to the Outfiqe CRM as ${role.name}: ${inviteUrl}`,
      html,
    });

    logger.info(`CRM invite sent to ${email} by ${invitedById}`);
  },

  async revokeInvite(organizationId: string, inviteId: string): Promise<void> {
    await crmAccessRepository.revokeInvite(organizationId, inviteId);
  },

  async acceptInvite(rawToken: string, acceptingUserId: string): Promise<MembershipRecord> {
    const invite = await crmAccessRepository.findInviteByTokenHash(hashToken(rawToken));
    if (!invite) {
      throw new AppError("INVITE_INVALID", "This invite link is invalid.", NOT_FOUND_STATUS);
    }
    if (invite.acceptedAt || invite.revokedAt || invite.expiresAt.getTime() <= Date.now()) {
      throw new AppError(
        "INVITE_INVALID",
        "This invite link has expired or was already used.",
        CONFLICT_STATUS,
      );
    }

    const acceptingUser = await userRepository.findById(acceptingUserId);
    if (!acceptingUser || acceptingUser.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new AppError(
        "INVITE_EMAIL_MISMATCH",
        "This invite was sent to a different account.",
        FORBIDDEN_STATUS,
      );
    }

    const existingMembership = await crmAccessRepository.findMembershipByUserAndOrg(
      acceptingUserId,
      invite.organizationId,
    );
    if (existingMembership) {
      throw new AppError("MEMBER_EXISTS", "You already have CRM access.", CONFLICT_STATUS);
    }

    try {
      return await crmAccessRepository.acceptInvite(invite, acceptingUserId);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new AppError("MEMBER_EXISTS", "You already have CRM access.", CONFLICT_STATUS);
      }
      throw err;
    }
  },
};
