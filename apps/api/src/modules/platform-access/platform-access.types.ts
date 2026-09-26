import type { PlatformPermissionKey } from "./platform-access.constants.js";

export type PlatformPrincipal = {
  actorUserId: string;
  permissionKeys: PlatformPermissionKey[];
};

export type PlatformAccess = {
  hasStaffAccess: boolean;
  hasFullAccess: boolean;
  permissionKeys: PlatformPermissionKey[];
};
