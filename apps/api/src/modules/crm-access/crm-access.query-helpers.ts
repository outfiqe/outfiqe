import type { RoleWithPermissions } from "./crm-access.types.js";

export const roleWithPermissionsInclude = {
  permissions: { include: { permission: true } },
} as const;

export const toRoleWithPermissions = (role: {
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
