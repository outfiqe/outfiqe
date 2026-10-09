import { prisma } from "#db/prisma.js";

import { roleWithPermissionsInclude, toRoleWithPermissions } from "../crm-access.query-helpers.js";
import type {
  CreateRoleInput,
  PermissionRecord,
  RoleWithPermissions,
  UpdateRoleInput,
} from "../crm-access.types.js";

export const crmRoleRepository = {
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

  async listRoles(organizationId: string): Promise<RoleWithPermissions[]> {
    const roles = await prisma.role.findMany({
      where: { organizationId },
      include: roleWithPermissionsInclude,
      orderBy: { name: "asc" },
    });
    return roles.map(toRoleWithPermissions);
  },
};
