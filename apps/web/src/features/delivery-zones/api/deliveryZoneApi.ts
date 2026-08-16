import { apiClient } from "@/shared/lib/apiClient";

import { type DeliveryZone, deliveryZoneSchema } from "./deliveryZoneSchemas";

export const deliveryZoneApi = {
  async list(): Promise<DeliveryZone[]> {
    const res = await apiClient.get<DeliveryZone[]>("/delivery-zones");
    return deliveryZoneSchema.array().parse(res.data);
  },
};
