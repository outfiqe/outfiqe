const EVERY_PERMISSION = "every-permission";

let grantedPermissionKeys: readonly string[] | typeof EVERY_PERMISSION = EVERY_PERMISSION;

export const MOCK_VIEWER_USER_ID = "viewer-user-id";

export const grantOnlyPlatformPermissions = (...permissionKeys: string[]): void => {
  grantedPermissionKeys = permissionKeys;
};

export const grantEveryPlatformPermission = (): void => {
  grantedPermissionKeys = EVERY_PERMISSION;
};

export const mockedUsePlatformPermissions = () => ({
  canUse: (...permissionKeys: string[]): boolean =>
    grantedPermissionKeys === EVERY_PERMISSION ||
    permissionKeys.some((key) => grantedPermissionKeys.includes(key)),
  viewerUserId: MOCK_VIEWER_USER_ID,
});
