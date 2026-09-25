import { PLATFORM_ACCESS_PERMISSION_KEY } from "#modules/crm-access/crm-access.constants.js";
import { PLATFORM_PERMISSION_KEYS } from "#modules/platform-access/platform-access.constants.js";

import type {
  PlatformRoleWithPermissions,
  UpdatePlatformRoleInput,
} from "./platform-roles.types.js";

const selectablePlatformPermissionKeys = new Set<string>(PLATFORM_PERMISSION_KEYS);

export const findUnselectablePlatformPermissionKeys = (permissionKeys: string[]): string[] =>
  permissionKeys.filter((key) => !selectablePlatformPermissionKeys.has(key));

export const withPlatformAccessKey = (permissionKeys: string[]): string[] => [
  ...new Set([...permissionKeys, PLATFORM_ACCESS_PERMISSION_KEY]),
];

export const withPlatformAccessKeyOnPermissionChange = (
  input: UpdatePlatformRoleInput,
): UpdatePlatformRoleInput =>
  input.permissionKeys === undefined
    ? input
    : { ...input, permissionKeys: withPlatformAccessKey(input.permissionKeys) };

export const withoutPlatformAccessKey = (
  role: PlatformRoleWithPermissions,
): PlatformRoleWithPermissions => ({
  ...role,
  permissionKeys: role.permissionKeys.filter((key) => key !== PLATFORM_ACCESS_PERMISSION_KEY),
});
