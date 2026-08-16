import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import {
  type OrderFeeSettings,
  orderFeeSettingsHistoryEntrySchema,
  orderFeeSettingsSchema,
  type OrderFeeValues,
} from "./schemas";

const orderFeeSettingsHistoryPageSchema = z.object({
  items: z.array(orderFeeSettingsHistoryEntrySchema),
  nextCursor: z.string().nullable(),
});
export type OrderFeeSettingsHistoryPage = z.infer<typeof orderFeeSettingsHistoryPageSchema>;

export type UpdateOrderFeeSettingsInput = Partial<OrderFeeValues>;

export const orderFeeSettingsApi = {
  async get(): Promise<OrderFeeSettings> {
    const res = await apiClient.get<OrderFeeSettings>("/order-fee-settings");
    return orderFeeSettingsSchema.parse(res.data);
  },

  async update(input: UpdateOrderFeeSettingsInput): Promise<OrderFeeSettings> {
    const res = await apiClient.patch<OrderFeeSettings>("/order-fee-settings", input);
    return orderFeeSettingsSchema.parse(res.data);
  },

  async listHistory(cursor?: string): Promise<OrderFeeSettingsHistoryPage> {
    const query = cursor ? `?cursor=${cursor}` : "";
    const res = await apiClient.get<OrderFeeSettingsHistoryPage>(
      `/order-fee-settings/history${query}`,
    );
    return orderFeeSettingsHistoryPageSchema.parse(res.data);
  },
};
