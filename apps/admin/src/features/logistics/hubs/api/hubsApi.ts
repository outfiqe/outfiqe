import { apiClient } from "@/lib/apiClient";

import { type Hub, hubListSchema, type HubRequestBody, hubSchema } from "./hubsSchemas";

const HUBS_PATH = "/logistics/admin/hubs";

export const hubsApi = {
  async list(): Promise<Hub[]> {
    const res = await apiClient.get(HUBS_PATH);
    return hubListSchema.parse(res.data).hubs;
  },

  async create(body: HubRequestBody): Promise<Hub> {
    const res = await apiClient.post(HUBS_PATH, body);
    return hubSchema.parse(res.data);
  },

  async update(hubId: string, body: HubRequestBody): Promise<Hub> {
    const res = await apiClient.put(`${HUBS_PATH}/${hubId}`, body);
    return hubSchema.parse(res.data);
  },

  async setPickupZones(hubId: string, deliveryZoneIds: string[]): Promise<Hub> {
    const res = await apiClient.put(`${HUBS_PATH}/${hubId}/pickup-zones`, { deliveryZoneIds });
    return hubSchema.parse(res.data);
  },
};
