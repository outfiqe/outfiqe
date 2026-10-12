import { HTTP_STATUS } from "#constants/http.constants.js";
import { AppError } from "#middlewares/error-handler.js";

import type { ActingPermissionGrant } from "./crm-access.types.js";

export const assertPermissionKeysWithinActorGrant = (
  permissionKeys: string[],
  actingGrant: ActingPermissionGrant,
): void => {
  if (actingGrant.isSuperAdmin) return;

  const permissionsBeyondActorGrant = permissionKeys.filter(
    (key) => !actingGrant.permissionKeys.includes(key),
  );
  if (permissionsBeyondActorGrant.length > 0) {
    throw new AppError(
      "PERMISSION_EXCEEDS_ACTOR_GRANT",
      "You can't grant a permission you don't hold yourself.",
      HTTP_STATUS.FORBIDDEN,
    );
  }
};
