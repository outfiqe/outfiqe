import { prisma } from "#db/prisma.js";
import type { MembershipStatus } from "#generated/prisma/enums.js";

import { BUILT_IN_ROLE_NAME, BUILT_IN_ROLE_PERMISSIONS } from "./crm-access.constants.js";
import type {
  CreateOrganizationInviteInput,
  CreateRoleInput,
  MembershipJoinRow,
  MembershipRecord,
  MembershipWithRole,
  OrganizationInviteRecord,
  OrganizationRecord,
  PermissionRecord,
  RoleWithPermissions,
  UpdateMembershipInput,
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

  async listOrganizations(): Promise<OrganizationRecord[]> {
    return prisma.organization.findMany({ orderBy: { createdAt: "asc" } });
  },

  async findPlatformOrganization(): Promise<OrganizationRecord | null> {
    return prisma.organization.findFirst({ where: { isPlatformOrg: true } });
  },

  async hasAnyMembership(userId: string): Promise<boolean> {
    const membership = await prisma.membership.findFirst({ where: { userId } });
    return membership !== null;
  },

  async findOrganizationBySubdomain(subdomain: string): Promise<OrganizationRecord | null> {
    return prisma.organization.findUnique({ where: { subdomain } });
  },

  async createOrganization(input: {
    name: string;
    subdomain: string;
    superAdminUserId: string;
  }): Promise<{ organization: OrganizationRecord; membership: MembershipRecord }> {
    return prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: input.name, subdomain: input.subdomain },
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

  async acceptInvite(
    invite: OrganizationInviteRecord,
    acceptingUserId: string,
  ): Promise<MembershipRecord> {
    return prisma.$transaction(async (tx) => {
      const membership = await tx.membership.create({
        data: {
          userId: acceptingUserId,
          organizationId: invite.organizationId,
          roleId: invite.roleId,
          status: "ACTIVE",
        },
      });

      await tx.organizationInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });

      return membership;
    });
  },
};
