import { apiClient } from "@/shared/lib/apiClient";

import {
  type PickupLocation,
  pickupLocationListSchema,
  type PickupLocationRequestBody,
  pickupLocationSchema,
} from "./pickupLocationSchemas";

const PICKUP_LOCATIONS_PATH = "/logistics/brand/pickup-locations";

export const pickupLocationApi = {
  async list(): Promise<PickupLocation[]> {
    const res = await apiClient.get(PICKUP_LOCATIONS_PATH);
    return pickupLocationListSchema.parse(res.data).pickupLocations;
  },

  async create(body: PickupLocationRequestBody): Promise<PickupLocation> {
    const res = await apiClient.post(PICKUP_LOCATIONS_PATH, body);
    return pickupLocationSchema.parse(res.data);
  },

  async update(locationId: string, body: PickupLocationRequestBody): Promise<PickupLocation> {
    const res = await apiClient.put(`${PICKUP_LOCATIONS_PATH}/${locationId}`, body);
    return pickupLocationSchema.parse(res.data);
  },

  async makeDefault(locationId: string): Promise<void> {
    await apiClient.post(`${PICKUP_LOCATIONS_PATH}/${locationId}/default`);
  },

  async remove(locationId: string): Promise<void> {
    await apiClient.del(`${PICKUP_LOCATIONS_PATH}/${locationId}`);
  },
};
