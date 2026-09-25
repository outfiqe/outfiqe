import { PLATFORM_PERMISSION_KEYS } from "#modules/platform-access/platform-access.constants.js";

const selectablePlatformPermissionKeys = new Set<string>(PLATFORM_PERMISSION_KEYS);

export const findUnselectablePlatformPermissionKeys = (permissionKeys: string[]): string[] =>
  permissionKeys.filter((key) => !selectablePlatformPermissionKeys.has(key));
