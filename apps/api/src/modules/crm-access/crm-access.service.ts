import { HTTP_STATUS } from "#constants/http.constants.js";
import { DomainEvents, eventBus } from "#events/event-bus.js";
import { MembershipStatus } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";
import { platformAccessService } from "#modules/platform-access/platform-access.service.js";
import type { DbClient } from "#types/db.types.js";

import { assertPermissionKeysWithinActorGrant } from "./crm-access.guards.js";
import { crmAccessRepository } from "./crm-access.repository.js";
import type {
  ActingPermissionGrant,
  MembershipRecord,
  MembershipSummary,
  OrganizationRecord,
} from "./crm-access.types.js";
import { toMembershipSummary } from "./crm-access.utils.js";
import { crmInviteService } from "./invites/invite.service.js";
import { crmOrganizationService } from "./organizations/organization.service.js";
import { crmOwnershipTransferService } from "./ownership-transfer/ownership-transfer.service.js";
import { crmRoleRepository } from "./roles/role.repository.js";
import { crmRoleService } from "./roles/role.service.js";

export const crmAccessService = {
  async resolveHasPlatformAccess(userId: string): Promise<boolean> {
    const { hasStaffAccess } = await platformAccessService.resolveAccess(userId);
    return hasStaffAccess;
  },

  async findHomeTenantSubdomain(userId: string): Promise<string | null> {
    return crmAccessRepository.findHomeTenantSubdomain(userId);
  },

  async resolveHasCrmAccess(userId: string): Promise<boolean> {
    return crmAccessRepository.hasActiveMembership(userId);
  },

  async grantPlatformStaffMembership(
    userId: string,
    roleId: string,
    client?: DbClient,
  ): Promise<MembershipRecord | null> {
    return crmAccessRepository.grantPlatformStaffMembership(userId, roleId, client);
  },

  async listMembers(organization: OrganizationRecord): Promise<MembershipSummary[]> {
    const memberships = await crmAccessRepository.listMemberships(organization.id);
    return memberships.map((membership) =>
      toMembershipSummary(membership, organization.superAdminMembershipId),
    );
  },

  async updateMembership(
    organization: OrganizationRecord,
    actingMembershipId: string,
    membershipId: string,
    data: { roleId?: string; status?: MembershipStatus },
    actingGrant: ActingPermissionGrant,
  ): Promise<MembershipRecord> {
    if (membershipId === actingMembershipId) {
      throw new AppError(
        "MEMBERSHIP_SELF_UPDATE_FORBIDDEN",
        "You can't change your own role or access. Ask another admin to do it.",
        HTTP_STATUS.FORBIDDEN,
      );
    }

    if (organization.superAdminMembershipId === membershipId) {
      throw new AppError(
        "SUPERADMIN_MEMBERSHIP_LOCKED",
        "The SUPERADMIN membership can't be edited this way. Use ownership transfer instead.",
        HTTP_STATUS.FORBIDDEN,
      );
    }

    const membership = await crmAccessRepository.findMembershipById(organization.id, membershipId);
    if (!membership) {
      throw new AppError("MEMBERSHIP_NOT_FOUND", "Member not found.", HTTP_STATUS.NOT_FOUND);
    }

    if (data.roleId) {
      const role = await crmRoleRepository.findRoleById(organization.id, data.roleId);
      if (!role) {
        throw new AppError("ROLE_NOT_FOUND", "Role not found.", HTTP_STATUS.NOT_FOUND);
      }
      assertPermissionKeysWithinActorGrant(role.permissionKeys, actingGrant);
    }

    const updatedMembership = await crmAccessRepository.updateMembership(
      organization.id,
      membershipId,
      data,
    );

    const hasLostAccess =
      membership.status === MembershipStatus.ACTIVE &&
      updatedMembership.status !== MembershipStatus.ACTIVE;
    if (hasLostAccess) {
      await eventBus.publish(DomainEvents.CRM_MEMBERSHIP_ENDED, {
        organizationId: organization.id,
        userId: membership.userId,
      });
    }

    return updatedMembership;
  },

  ...crmOrganizationService,

  ...crmRoleService,

  ...crmInviteService,

  ...crmOwnershipTransferService,
};
