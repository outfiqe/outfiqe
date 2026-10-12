import { isStaffUserRole } from "@outfiqe/utils";

import { env } from "#config/env.config.js";
import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { crmOrganizationInviteTemplate } from "#email-templates/crm.templates.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { sendEmail } from "#lib/email.utils.js";
import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";
import { isUniqueConstraintError, runWithDeadlockRetry } from "#lib/prisma.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { crmBillingRepository } from "#modules/crm-billing/crm-billing.repository.js";
import { userRepository } from "#modules/users/user.repository.js";
import { describeError } from "#redis/redis.utils.js";
import type { DbClient } from "#types/db.types.js";

import { ORGANIZATION_INVITE_TTL_MS } from "../crm-access.constants.js";
import { assertPermissionKeysWithinActorGrant } from "../crm-access.guards.js";
import { crmAccessRepository } from "../crm-access.repository.js";
import type {
  ActingPermissionGrant,
  CrmInviteRegistrationInfo,
  MembershipRecord,
  OrganizationInviteRecord,
  OrganizationInviteSummary,
  OrganizationRecord,
} from "../crm-access.types.js";
import { buildOrganizationAdminUrl, toInviteSummary } from "../crm-access.utils.js";
import { crmOrganizationRepository } from "../organizations/organization.repository.js";
import { crmRoleRepository } from "../roles/role.repository.js";
import { crmInviteRepository } from "./invite.repository.js";

export const crmInviteService = {
  async listInvites(organizationId: string): Promise<OrganizationInviteSummary[]> {
    const invites = await crmInviteRepository.listInvites(organizationId);
    return invites.map(toInviteSummary);
  },

  async inviteMember(
    organization: OrganizationRecord,
    email: string,
    roleId: string,
    invitedById: string,
    actingGrant: ActingPermissionGrant,
  ): Promise<void> {
    const role = await crmRoleRepository.findRoleById(organization.id, roleId);
    if (!role) {
      throw new AppError("ROLE_NOT_FOUND", "Role not found.", HTTP_STATUS.NOT_FOUND);
    }
    assertPermissionKeysWithinActorGrant(role.permissionKeys, actingGrant);

    const invitedUser = await userRepository.findByEmail(email);
    if (invitedUser && !isStaffUserRole(invitedUser.role)) {
      throw new AppError(
        "EMAIL_IN_USE",
        "That email already belongs to a non-staff Outfiqe account and can't be added as staff.",
        HTTP_STATUS.CONFLICT,
      );
    }

    const rawToken = generateOpaqueToken();

    await runWithDeadlockRetry(() =>
      prisma.$transaction(async (tx) => {
        await crmInviteRepository.acquireOrganizationInviteLock(tx, organization.id);

        if (invitedUser) {
          const existingMembership = await crmAccessRepository.findMembershipByUserAndOrg(
            invitedUser.id,
            organization.id,
            tx,
          );
          if (existingMembership) {
            throw new AppError(
              "MEMBER_EXISTS",
              "This person already has CRM access.",
              HTTP_STATUS.CONFLICT,
            );
          }
        }

        const pendingInvite = await crmInviteRepository.findPendingInviteByEmail(
          organization.id,
          email,
          tx,
        );
        if (pendingInvite) {
          throw new AppError(
            "INVITE_ALREADY_PENDING",
            "An invite is already pending for this email.",
            HTTP_STATUS.CONFLICT,
          );
        }

        const subscription = await crmBillingRepository.findSubscriptionByOrganizationId(
          organization.id,
          tx,
        );
        if (subscription) {
          const [activeMemberCount, pendingInviteCount] = await Promise.all([
            crmBillingRepository.countActiveMemberships(organization.id, tx),
            crmInviteRepository.countPendingInvites(organization.id, tx),
          ]);
          const seatsInUse = activeMemberCount + pendingInviteCount;
          if (seatsInUse >= subscription.seats) {
            throw new AppError(
              "SEAT_LIMIT_REACHED",
              "You've used every seat on your current plan. Upgrade your plan or free up a seat to invite someone new.",
              HTTP_STATUS.CONFLICT,
            );
          }
        }

        return crmInviteRepository.createInvite(
          {
            organizationId: organization.id,
            email,
            roleId,
            tokenHash: hashToken(rawToken),
            expiresAt: new Date(Date.now() + ORGANIZATION_INVITE_TTL_MS),
            invitedById,
          },
          tx,
        );
      }),
    );

    const inviteeNeedsAccount = !invitedUser;
    const invitePath = inviteeNeedsAccount
      ? `/crm/invites/register?token=${rawToken}`
      : `/crm/invites/accept?token=${rawToken}`;
    const inviteUrl = buildOrganizationAdminUrl(
      organization,
      invitePath,
      env.ADMIN_URL,
      env.TENANT_BASE_DOMAIN,
    );
    const { subject, html } = crmOrganizationInviteTemplate(role.name, inviteUrl);

    try {
      await sendEmail({
        to: email,
        subject,
        body: `You've been invited to the Outfiqe CRM as ${role.name}: ${inviteUrl}`,
        html,
      });
    } catch (error) {
      logger.error(`CRM invite email to ${email} failed to send: ${describeError(error)}`);
    }

    logger.info(`CRM invite sent to ${email} by ${invitedById}`);
  },

  async revokeInvite(organizationId: string, inviteId: string): Promise<void> {
    await crmInviteRepository.revokeInvite(organizationId, inviteId);
  },

  async findAcceptableInvite(rawToken: string): Promise<OrganizationInviteRecord> {
    const invite = await crmInviteRepository.findInviteByTokenHash(hashToken(rawToken));
    if (!invite) {
      throw new AppError("INVITE_INVALID", "This invite link is invalid.", HTTP_STATUS.NOT_FOUND);
    }
    if (invite.acceptedAt || invite.revokedAt || invite.expiresAt.getTime() <= Date.now()) {
      throw new AppError(
        "INVITE_INVALID",
        "This invite link has expired or was already used.",
        HTTP_STATUS.CONFLICT,
      );
    }
    return invite;
  },

  async getInviteRegistrationInfo(rawToken: string): Promise<CrmInviteRegistrationInfo> {
    const invite = await crmInviteService.findAcceptableInvite(rawToken);
    const [organization, role, existingUser] = await Promise.all([
      crmOrganizationRepository.findOrganizationById(invite.organizationId),
      crmRoleRepository.findRoleById(invite.organizationId, invite.roleId),
      userRepository.findByEmail(invite.email),
    ]);
    return {
      email: invite.email,
      organizationName: organization?.name ?? "",
      roleName: role?.name ?? "",
      requiresRegistration: !existingUser,
    };
  },

  async attachMembershipForInvite(
    invite: OrganizationInviteRecord,
    acceptingUserId: string,
    client: DbClient,
  ): Promise<MembershipRecord> {
    return crmInviteRepository.acceptInviteWithClient(invite, acceptingUserId, client);
  },

  async announceMemberJoined(membership: MembershipRecord): Promise<void> {
    await eventBus.publish(DomainEvents.CRM_MEMBER_JOINED, {
      organizationId: membership.organizationId,
      membershipId: membership.id,
      userId: membership.userId,
    });
  },

  async acceptInvite(rawToken: string, acceptingUserId: string): Promise<MembershipRecord> {
    const invite = await crmInviteService.findAcceptableInvite(rawToken);

    const acceptingUser = await userRepository.findById(acceptingUserId);
    if (!acceptingUser || acceptingUser.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new AppError(
        "INVITE_EMAIL_MISMATCH",
        "This invite was sent to a different account.",
        HTTP_STATUS.FORBIDDEN,
      );
    }

    const existingMembership = await crmAccessRepository.findMembershipByUserAndOrg(
      acceptingUserId,
      invite.organizationId,
    );
    if (existingMembership) {
      throw new AppError("MEMBER_EXISTS", "You already have CRM access.", HTTP_STATUS.CONFLICT);
    }

    let membership: MembershipRecord;
    try {
      membership = await crmInviteRepository.acceptInvite(invite, acceptingUserId);
    } catch (err) {
      if (isUniqueConstraintError(err)) {
        throw new AppError("MEMBER_EXISTS", "You already have CRM access.", HTTP_STATUS.CONFLICT);
      }
      throw err;
    }

    await crmInviteService.announceMemberJoined(membership);
    return membership;
  },
};
