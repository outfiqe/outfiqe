import { apiClient } from "@/shared/lib/apiClient";

import {
  type DeliveryZone,
  type DeliveryZoneCityMatch,
  deliveryZoneCitySearchResultSchema,
  deliveryZoneSchema,
} from "./deliveryZoneSchemas";

const CITY_SEARCH_LIMIT = 20;

export const deliveryZoneApi = {
  async list(): Promise<DeliveryZone[]> {
    const res = await apiClient.get<DeliveryZone[]>("/delivery-zones");
    return deliveryZoneSchema.array().parse(res.data);
  },

  async searchCities(q: string): Promise<DeliveryZoneCityMatch[]> {
    const params = new URLSearchParams({ q, limit: String(CITY_SEARCH_LIMIT) });
    const res = await apiClient.get<{ cities: DeliveryZoneCityMatch[] }>(
      `/delivery-zones/cities?${params.toString()}`,
    );
    return deliveryZoneCitySearchResultSchema.parse(res.data).cities;
  },
};
