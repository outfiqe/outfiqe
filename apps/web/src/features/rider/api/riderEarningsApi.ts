import { apiClient } from "@/shared/lib/apiClient";

import { type RiderEarningsPage, riderEarningsPageSchema } from "./riderEarningsSchemas";

const RIDER_EARNINGS_PATH = "/logistics/rider/earnings";

export const riderEarningsApi = {
  async listMyEarnings(cursor?: string): Promise<RiderEarningsPage> {
    const res = await apiClient.get(RIDER_EARNINGS_PATH, { params: { cursor } });
    return riderEarningsPageSchema.parse(res.data);
  },
};
