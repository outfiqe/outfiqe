import type { AdminUser } from "@/features/auth/schemas";

export const PLATFORM_OVERVIEW_PATH = "/platform";
const PLATFORM_OVERVIEW_PERMISSION_KEY = "platform:metrics:read";

export type PlatformPermissionViewer = Pick<
  AdminUser,
  "hasPlatformAccess" | "isCoFounder" | "platformPermissionKeys"
>;

export const holdsAnyPlatformPermission = (
  viewer: PlatformPermissionViewer,
  ...permissionKeys: string[]
): boolean =>
  viewer.hasPlatformAccess &&
  (viewer.isCoFounder || permissionKeys.some((key) => viewer.platformPermissionKeys.includes(key)));

export const canOpenPlatformOverview = (viewer: PlatformPermissionViewer): boolean =>
  holdsAnyPlatformPermission(viewer, PLATFORM_OVERVIEW_PERMISSION_KEY);
