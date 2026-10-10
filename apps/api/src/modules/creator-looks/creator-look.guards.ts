import { HTTP_STATUS } from "#constants/http.constants.js";
import type { UserRole } from "#generated/prisma/enums.js";
import { AppError } from "#middlewares/error-handler.js";
import { CONTENT_MODERATE_PERMISSION_KEY } from "#modules/platform-access/platform-access.constants.js";
import { platformAccessService } from "#modules/platform-access/platform-access.service.js";

import { creatorLookRepository } from "./creator-look.repository.js";

export const isPlatformModerator = (principal: {
  userId: string;
  role: UserRole;
}): Promise<boolean> =>
  platformAccessService.principalHasPermission(principal, CONTENT_MODERATE_PERMISSION_KEY);

export const requireActiveLook = async (
  lookId: string,
): Promise<{ id: string; creatorId: string }> => {
  const look = await creatorLookRepository.findActiveById(lookId);
  if (!look)
    throw new AppError("LOOK_NOT_FOUND", "This look no longer exists.", HTTP_STATUS.NOT_FOUND);
  return look;
};
