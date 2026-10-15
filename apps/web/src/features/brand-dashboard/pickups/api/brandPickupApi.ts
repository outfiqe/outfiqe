import { apiClient } from "@/shared/lib/apiClient";

import { type BrandPickup, brandPickupSchema } from "./brandPickupSchemas";

const BRAND_PICKUPS_PATH = "/logistics/brand/pickups";

export const brandPickupApi = {
  async markReady(fulfilmentGroupId: string): Promise<BrandPickup> {
    const res = await apiClient.post(`${BRAND_PICKUPS_PATH}/${fulfilmentGroupId}/ready`);
    return brandPickupSchema.parse(res.data);
  },
};
