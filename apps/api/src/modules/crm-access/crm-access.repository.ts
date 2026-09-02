import { addDays } from "date-fns/addDays";

import { TENANT_ORGANIZATION_SCOPE } from "#constants/organization.constants.js";
import { prisma } from "#db/prisma.js";
import type { MembershipStatus } from "#generated/prisma/enums.js";
import { DEFAULT_PIPELINE_STAGES } from "#modules/crm-pipeline/crm-pipeline.constants.js";
import type { DbClient } from "#types/db.types.js";

import {
  BUILT_IN_ROLE_NAME,
  BUILT_IN_ROLE_PERMISSIONS,
  CRM_TRIAL_LENGTH_DAYS,
} from "./crm-access.constants.js";
import type {
  CreateOrganizationInviteInput,
  CreateOrganizationParams,
  CreateOwnershipTransferRequestInput,
  CreateRoleInput,
  MembershipJoinRow,
  MembershipRecord,
  MembershipWithRole,
  OrganizationInviteRecord,
  OrganizationListItem,
  OrganizationRecord,
  OwnershipTransferJoinRow,
  OwnershipTransferRequestRecord,
  PermissionRecord,
  RoleWithPermissions,
  UpdateMembershipInput,
  UpdateRoleInput,
} from "./crm-access.types.js";

const roleWithPermissionsInclude = {
  permissions: { include: { permission: true } },
} as const;

const toRoleWithPermissions = (role: {
  id: string;
  organizationId: string;
  name: string;
  isBuiltIn: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions: { permissionKey: string }[];
}): RoleWithPermissions => ({
  id: role.id,
  organizationId: role.organizationId,
  name: role.name,
  isBuiltIn: role.isBuiltIn,
  createdAt: role.createdAt,
  updatedAt: role.updatedAt,
  permissionKeys: role.permissions.map((rolePermission) => rolePermission.permissionKey),
});

export const crmAccessRepository = {
  async findDefaultOrganization(): Promise<OrganizationRecord | null> {
    return prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
  },

  async listOrganizations(): Promise<OrganizationListItem[]> {
    const organizations = await prisma.organization.findMany({
      where: TENANT_ORGANIZATION_SCOPE,
      orderBy: { createdAt: "asc" },
      include: { linkedBrand: { select: { name: true } } },
    });
    return organizations.map(({ linkedBrand, ...organization }) => ({
      ...organization,
      linkedBrandName: linkedBrand?.name ?? null,
    }));
  },

  async findPlatformOrganization(): Promise<OrganizationRecord | null> {
    return prisma.organization.findFirst({ where: { isPlatformOrg: true } });
  },

  async findOrganizationByLinkedBrandId(brandId: string): Promise<OrganizationRecord | null> {
    return prisma.organization.findUnique({ where: { linkedBrandId: brandId } });
  },

  async hasAnyMembership(userId: string): Promise<boolean> {
    const membership = await prisma.membership.findFirst({ where: { userId } });
    return membership !== null;
  },

  async hasActiveMembership(userId: string): Promise<boolean> {
    const membership = await prisma.membership.findFirst({
      where: { userId, status: "ACTIVE" },
    });
    return membership !== null;
  },

  async grantPlatformStaffMembership(
    userId: string,
    client: DbClient = prisma,
  ): Promise<MembershipRecord | null> {
    const platformOrganization = await client.organization.findFirst({
      where: { isPlatformOrg: true },
    });
    if (!platformOrganization) return null;

    const adminRole = await client.role.findFirst({
      where: { organizationId: platformOrganization.id, name: BUILT_IN_ROLE_NAME.ADMIN },
    });
    if (!adminRole) return null;

    return client.membership.upsert({
      where: { userId_organizationId: { userId, organizationId: platformOrganization.id } },
      update: {},
      create: {
        userId,
        organizationId: platformOrganization.id,
        roleId: adminRole.id,
        status: "ACTIVE",
      },
    });
  },

  async findOrganizationBySubdomain(subdomain: string): Promise<OrganizationRecord | null> {
    return prisma.organization.findUnique({ where: { subdomain } });
  },

  async findOrganizationById(organizationId: string): Promise<OrganizationRecord | null> {
    return prisma.organization.findUnique({ where: { id: organizationId } });
  },

  async createOrganization(
    input: CreateOrganizationParams,
  ): Promise<{ organization: OrganizationRecord; membership: MembershipRecord }> {
    return prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: input.name,
          subdomain: input.subdomain,
          linkedBrandId: input.linkedBrandId ?? null,
          trialEndsAt: addDays(new Date(), CRM_TRIAL_LENGTH_DAYS),
        },
      });

      let adminRoleId: string | undefined;
      for (const [roleName, permissionKeys] of Object.entries(BUILT_IN_ROLE_PERMISSIONS)) {
        const role = await tx.role.create({
          data: {
            organizationId: organization.id,
            name: roleName,
            isBuiltIn: true,
            permissions: { create: permissionKeys.map((permissionKey) => ({ permissionKey })) },
          },
        });
        if (roleName === BUILT_IN_ROLE_NAME.ADMIN) adminRoleId = role.id;
      }
      if (!adminRoleId) throw new Error("built-in Admin role was not created");

      await tx.pipelineStage.createMany({
        data: DEFAULT_PIPELINE_STAGES.map((stage) => ({
          organizationId: organization.id,
          name: stage.name,
          sortOrder: stage.sortOrder,
          isWon: stage.isWon,
          isLost: stage.isLost,
        })),
      });

      const membership = await tx.membership.create({
        data: {
          userId: input.superAdminUserId,
          organizationId: organization.id,
          roleId: adminRoleId,
          status: "ACTIVE",
        },
      });

      const superAdminOrganization = await tx.organization.update({
        where: { id: organization.id },
        data: { superAdminMembershipId: membership.id },
      });

      return { organization: superAdminOrganization, membership };
    });
  },

  async setSuperAdminMembership(organizationId: string, membershipId: string): Promise<void> {
    await prisma.organization.update({
      where: { id: organizationId },
      data: { superAdminMembershipId: membershipId },
    });
  },

  async listPermissions(): Promise<PermissionRecord[]> {
    return prisma.permission.findMany({ orderBy: [{ group: "asc" }, { key: "asc" }] });
  },

  async createRole(input: CreateRoleInput): Promise<RoleWithPermissions> {
    const role = await prisma.role.create({
      data: {
        organizationId: input.organizationId,
        name: input.name,
        isBuiltIn: input.isBuiltIn ?? false,
        permissions: {
          create: input.permissionKeys.map((permissionKey) => ({ permissionKey })),
        },
      },
      include: roleWithPermissionsInclude,
    });
    return toRoleWithPermissions(role);
  },

  async findRoleById(organizationId: string, roleId: string): Promise<RoleWithPermissions | null> {
    const role = await prisma.role.findFirst({
      where: { id: roleId, organizationId },
      include: roleWithPermissionsInclude,
    });
    return role ? toRoleWithPermissions(role) : null;
  },

  async updateRole(
    organizationId: string,
    roleId: string,
    input: UpdateRoleInput,
  ): Promise<RoleWithPermissions> {
    const role = await prisma.$transaction(async (tx) => {
      if (input.name !== undefined) {
        await tx.role.update({ where: { id: roleId, organizationId }, data: { name: input.name } });
      }
      if (input.permissionKeys !== undefined) {
        await tx.rolePermission.deleteMany({ where: { roleId } });
        await tx.rolePermission.createMany({
          data: input.permissionKeys.map((permissionKey) => ({ roleId, permissionKey })),
        });
      }
      return tx.role.findFirstOrThrow({
        where: { id: roleId, organizationId },
        include: roleWithPermissionsInclude,
      });
    });
    return toRoleWithPermissions(role);
  },

  async deleteRole(organizationId: string, roleId: string): Promise<void> {
    await prisma.role.delete({ where: { id: roleId, organizationId } });
  },

  async countMembershipsForRole(organizationId: string, roleId: string): Promise<number> {
    return prisma.membership.count({ where: { organizationId, roleId } });
  },

  async updateOrganizationName(organizationId: string, name: string): Promise<OrganizationRecord> {
    return prisma.organization.update({ where: { id: organizationId }, data: { name } });
  },

  async listRoles(organizationId: string): Promise<RoleWithPermissions[]> {
    const roles = await prisma.role.findMany({
      where: { organizationId },
      include: roleWithPermissionsInclude,
      orderBy: { name: "asc" },
    });
    return roles.map(toRoleWithPermissions);
  },

  async findMembershipByUserAndOrg(
    userId: string,
    organizationId: string,
  ): Promise<MembershipWithRole | null> {
    const membership = await prisma.membership.findUnique({
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

  async findOrganizationsOwnedByUser(userId: string): Promise<OrganizationRecord[]> {
    const memberships = await prisma.membership.findMany({
      where: { userId },
      select: { id: true },
    });
    const membershipIds = memberships.map((membership) => membership.id);
    if (membershipIds.length === 0) return [];

    return prisma.organization.findMany({
      where: { superAdminMembershipId: { in: membershipIds } },
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

  async createInvite(input: CreateOrganizationInviteInput): Promise<OrganizationInviteRecord> {
    return prisma.organizationInvite.create({ data: input });
  },

  async findInviteByTokenHash(tokenHash: string): Promise<OrganizationInviteRecord | null> {
    return prisma.organizationInvite.findUnique({ where: { tokenHash } });
  },

  async findPendingInviteByEmail(
    organizationId: string,
    email: string,
  ): Promise<OrganizationInviteRecord | null> {
    return prisma.organizationInvite.findFirst({
      where: {
        organizationId,
        email,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  },

  async listInvites(
    organizationId: string,
  ): Promise<(OrganizationInviteRecord & { roleName: string })[]> {
    const invites = await prisma.organizationInvite.findMany({
      where: { organizationId },
      include: { role: true },
      orderBy: { createdAt: "desc" },
    });
    return invites.map((invite) => ({ ...invite, roleName: invite.role.name }));
  },

  async revokeInvite(organizationId: string, inviteId: string): Promise<void> {
    await prisma.organizationInvite.update({
      where: { id: inviteId, organizationId },
      data: { revokedAt: new Date() },
    });
  },

  async acceptInviteWithClient(
    invite: OrganizationInviteRecord,
    acceptingUserId: string,
    client: DbClient = prisma,
  ): Promise<MembershipRecord> {
    const membership = await client.membership.create({
      data: {
        userId: acceptingUserId,
        organizationId: invite.organizationId,
        roleId: invite.roleId,
        status: "ACTIVE",
      },
    });

    await client.organizationInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });

    return membership;
  },

  async acceptInvite(
    invite: OrganizationInviteRecord,
    acceptingUserId: string,
  ): Promise<MembershipRecord> {
    return prisma.$transaction((tx) =>
      crmAccessRepository.acceptInviteWithClient(invite, acceptingUserId, tx),
    );
  },

  async createOwnershipTransferRequest(
    input: CreateOwnershipTransferRequestInput,
  ): Promise<OwnershipTransferRequestRecord> {
    return prisma.ownershipTransferRequest.create({ data: input });
  },

  async findOwnershipTransferById(
    organizationId: string,
    requestId: string,
  ): Promise<OwnershipTransferRequestRecord | null> {
    return prisma.ownershipTransferRequest.findFirst({
      where: { id: requestId, organizationId },
    });
  },

  async findPendingOwnershipTransfer(
    organizationId: string,
  ): Promise<OwnershipTransferJoinRow | null> {
    return prisma.ownershipTransferRequest.findFirst({
      where: {
        organizationId,
        acceptedAt: null,
        declinedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        toMembership: { select: { userId: true, user: { select: { name: true } } } },
        fromMembership: { select: { user: { select: { name: true } } } },
      },
    });
  },

  async acceptOwnershipTransfer(request: OwnershipTransferRequestRecord): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.organization.update({
        where: { id: request.organizationId },
        data: { superAdminMembershipId: request.toMembershipId },
      });

      await tx.ownershipTransferRequest.update({
        where: { id: request.id },
        data: { acceptedAt: new Date() },
      });

      if (request.removeSenderMembershipOnAccept) {
        await tx.membership.delete({ where: { id: request.fromMembershipId } });
      }
    });
  },

  async declineOwnershipTransfer(organizationId: string, requestId: string): Promise<void> {
    await prisma.ownershipTransferRequest.update({
      where: { id: requestId, organizationId },
      data: { declinedAt: new Date() },
    });
  },

  async revokeOwnershipTransfer(organizationId: string, requestId: string): Promise<void> {
    await prisma.ownershipTransferRequest.update({
      where: { id: requestId, organizationId },
      data: { revokedAt: new Date() },
    });
  },
};
