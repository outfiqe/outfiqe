import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import { type DeliveryZone, deliveryZoneHistoryEntrySchema, deliveryZoneSchema } from "./schemas";

const deliveryZoneHistoryPageSchema = z.object({
  items: z.array(deliveryZoneHistoryEntrySchema),
  nextCursor: z.string().nullable(),
});
export type DeliveryZoneHistoryPage = z.infer<typeof deliveryZoneHistoryPageSchema>;

export type DeliveryZoneInput = {
  name: string;
  cities: string[];
  standardDeliveryFee: number;
  freeDeliveryThreshold: number;
  codHandlingFee: number;
};
export type UpdateDeliveryZoneInput = Partial<DeliveryZoneInput>;

export const deliveryZonesApi = {
  async list(): Promise<DeliveryZone[]> {
    const res = await apiClient.get<DeliveryZone[]>("/delivery-zones");
    return z.array(deliveryZoneSchema).parse(res.data);
  },

  async create(input: DeliveryZoneInput): Promise<DeliveryZone> {
    const res = await apiClient.post<DeliveryZone>("/delivery-zones", input);
    return deliveryZoneSchema.parse(res.data);
  },

  async update(id: string, input: UpdateDeliveryZoneInput): Promise<DeliveryZone> {
    const res = await apiClient.patch<DeliveryZone>(`/delivery-zones/${id}`, input);
    return deliveryZoneSchema.parse(res.data);
  },

  async setDefault(id: string): Promise<DeliveryZone> {
    const res = await apiClient.patch<DeliveryZone>(`/delivery-zones/${id}/default`);
    return deliveryZoneSchema.parse(res.data);
  },

  async remove(id: string): Promise<void> {
    await apiClient.del(`/delivery-zones/${id}`);
  },

  async listHistory(cursor?: string): Promise<DeliveryZoneHistoryPage> {
    const query = cursor ? `?cursor=${cursor}` : "";
    const res = await apiClient.get<DeliveryZoneHistoryPage>(`/delivery-zones/history${query}`);
    return deliveryZoneHistoryPageSchema.parse(res.data);
  },
};
