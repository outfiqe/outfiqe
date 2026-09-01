import type { PlatformPermissionKey } from "./platform-access.constants.js";

export type PlatformPrincipal = {
  actorUserId: string;
  permissionKeys: PlatformPermissionKey[];
};
