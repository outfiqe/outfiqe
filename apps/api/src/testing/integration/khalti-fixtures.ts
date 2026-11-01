import { prisma } from "#db/prisma.js";
import { FeatureFlagRollout } from "#generated/prisma/enums.js";
import { KHALTI_PAYMENTS_FLAG } from "#modules/feature-flags/feature-flags.registry.js";
import { featureFlagsService } from "#modules/feature-flags/feature-flags.service.js";

const setKhaltiRollout = async (rollout: FeatureFlagRollout): Promise<void> => {
  await prisma.featureFlag.upsert({
    where: { key: KHALTI_PAYMENTS_FLAG },
    create: { key: KHALTI_PAYMENTS_FLAG, rollout },
    update: { rollout, allowedUserIds: [], allowedBrandIds: [] },
  });
  featureFlagsService.invalidate(KHALTI_PAYMENTS_FLAG);
};

export const turnKhaltiOn = () => setKhaltiRollout(FeatureFlagRollout.EVERYONE);

export const turnKhaltiOff = () => setKhaltiRollout(FeatureFlagRollout.OFF);
