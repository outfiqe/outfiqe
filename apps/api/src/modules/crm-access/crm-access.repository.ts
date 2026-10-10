import { prisma } from "#db/prisma.js";
import type { MembershipStatus } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

import { roleWithPermissionsInclude, toRoleWithPermissions } from "./crm-access.query-helpers.js";
import type {
  MembershipJoinRow,
  MembershipRecord,
  MembershipWithRole,
  OrganizationRecord,
  UpdateMembershipInput,
} from "./crm-access.types.js";
import { crmInviteRepository } from "./invites/invite.repository.js";
import { crmOrganizationRepository } from "./organizations/organization.repository.js";
import { crmOwnershipTransferRepository } from "./ownership-transfer/ownership-transfer.repository.js";
import { crmRoleRepository } from "./roles/role.repository.js";

export const crmAccessRepository = {
  async hasAnyMembership(userId: string): Promise<boolean> {
    const membership = await prisma.membership.findFirst({ where: { userId } });
    return membership !== null;
  },

  async findActiveMemberUserIdsHoldingAnyPermission(
    organization: Pick<OrganizationRecord, "id" | "superAdminMembershipId">,
    permissionKeys: readonly string[],
  ): Promise<string[]> {
    const memberships = await prisma.membership.findMany({
      where: {
        organizationId: organization.id,
        status: "ACTIVE",
        OR: [
          { isPlatformSuperAdmin: true },
          ...(organization.superAdminMembershipId
            ? [{ id: organization.superAdminMembershipId }]
            : []),
          { role: { permissions: { some: { permissionKey: { in: [...permissionKeys] } } } } },
        ],
      },
      select: { userId: true },
    });
    return memberships.map(({ userId }) => userId);
  },

  async findHomeTenantSubdomain(userId: string): Promise<string | null> {
    const membership = await prisma.membership.findFirst({
      where: { userId, status: "ACTIVE", organization: { isPlatformOrg: false } },
      orderBy: { createdAt: "asc" },
      select: { organization: { select: { subdomain: true } } },
    });
    return membership?.organization.subdomain ?? null;
  },

  async hasActiveMembership(userId: string): Promise<boolean> {
    const membership = await prisma.membership.findFirst({
      where: { userId, status: "ACTIVE" },
    });
    return membership !== null;
  },

  async grantPlatformStaffMembership(
    userId: string,
    roleId: string,
    client: DbClient = prisma,
  ): Promise<MembershipRecord | null> {
    const platformOrganization = await client.organization.findFirst({
      where: { isPlatformOrg: true },
    });
    if (!platformOrganization) return null;

    return client.membership.upsert({
      where: { userId_organizationId: { userId, organizationId: platformOrganization.id } },
      update: {},
      create: {
        userId,
        organizationId: platformOrganization.id,
        roleId,
        status: "ACTIVE",
      },
    });
  },

  async setSuperAdminMembership(organizationId: string, membershipId: string): Promise<void> {
    await prisma.organization.update({
      where: { id: organizationId },
      data: { superAdminMembershipId: membershipId },
    });
  },

  async findMembershipByUserAndOrg(
    userId: string,
    organizationId: string,
    client: DbClient = prisma,
  ): Promise<MembershipWithRole | null> {
    const membership = await client.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: { role: { include: roleWithPermissionsInclude } },
    });
    if (!membership) return null;

    return { ...membership, role: toRoleWithPermissions(membership.role) };
  },

  async findMembershipById(
    organizationId: string,
    membershipId: string,
  ): Promise<MembershipRecord | null> {
    return prisma.membership.findFirst({ where: { id: membershipId, organizationId } });
  },

  async listMemberships(organizationId: string): Promise<MembershipJoinRow[]> {
    return prisma.membership.findMany({
      where: { organizationId },
      select: {
        id: true,
        userId: true,
        roleId: true,
        status: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        role: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  },

  async createMembership(
    userId: string,
    organizationId: string,
    roleId: string,
    status: MembershipStatus,
  ): Promise<MembershipRecord> {
    return prisma.membership.create({ data: { userId, organizationId, roleId, status } });
  },

  async updateMembership(
    organizationId: string,
    membershipId: string,
    data: UpdateMembershipInput,
  ): Promise<MembershipRecord> {
    return prisma.membership.update({ where: { id: membershipId, organizationId }, data });
  },

  ...crmOrganizationRepository,

  ...crmRoleRepository,

  ...crmInviteRepository,

  ...crmOwnershipTransferRepository,
};
