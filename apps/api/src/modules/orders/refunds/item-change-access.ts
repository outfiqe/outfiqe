import { ORDER_LOGISTICS_FLAG } from "#modules/feature-flags/feature-flags.registry.js";
import { featureFlagsService } from "#modules/feature-flags/feature-flags.service.js";

export const orderItemChangeAccess = {
  listBrandIdsAllowingItemChanges(brandIds: readonly string[]): Promise<Set<string>> {
    return featureFlagsService.isEnabledForBrands(ORDER_LOGISTICS_FLAG, [...new Set(brandIds)]);
  },

  async isBrandAllowingItemChanges(brandId: string): Promise<boolean> {
    const allowedBrandIds = await featureFlagsService.isEnabledForBrands(ORDER_LOGISTICS_FLAG, [
      brandId,
    ]);
    return allowedBrandIds.has(brandId);
  },
};
