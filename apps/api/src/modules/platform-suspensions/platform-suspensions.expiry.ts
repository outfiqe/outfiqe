import logger from "#lib/winston.utils.js";

import { platformSuspensionsRepository } from "./platform-suspensions.repository.js";
import { platformSuspensionsService } from "./platform-suspensions.service.js";

export const runSuspensionExpirySweep = async (): Promise<{
  liftedUsers: number;
  liftedBrands: number;
}> => {
  const now = new Date();
  const [expiredUserIds, expiredBrandIds] = await Promise.all([
    platformSuspensionsRepository.findExpiredSuspendedUserIds(now),
    platformSuspensionsRepository.findExpiredSuspendedBrandIds(now),
  ]);

  for (const userId of expiredUserIds) {
    await platformSuspensionsService.unsuspendUser({ targetUserId: userId });
  }
  for (const brandId of expiredBrandIds) {
    await platformSuspensionsService.unsuspendBrand({ targetBrandId: brandId });
  }

  if (expiredUserIds.length > 0 || expiredBrandIds.length > 0) {
    logger.info(
      `Suspension expiry sweep lifted ${expiredUserIds.length} user(s) and ${expiredBrandIds.length} brand(s)`,
    );
  }

  return { liftedUsers: expiredUserIds.length, liftedBrands: expiredBrandIds.length };
};
