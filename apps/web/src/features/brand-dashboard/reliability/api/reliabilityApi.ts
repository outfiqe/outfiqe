import { apiClient } from "@/shared/lib/apiClient";

import { type DeliveryReliability, deliveryReliabilitySchema } from "./reliabilitySchemas";

export const reliabilityApi = {
  async getMine(cursor?: string): Promise<DeliveryReliability> {
    const res = await apiClient.get("/logistics/brand/reliability", { params: { cursor } });
    return deliveryReliabilitySchema.parse(res.data);
  },
};
