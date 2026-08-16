import { apiClient } from "@/shared/lib/apiClient";

import { type OrderFeeSettings, orderFeeSettingsSchema } from "./orderFeeSettingsSchemas";

export const orderFeeSettingsApi = {
  async get(): Promise<OrderFeeSettings> {
    const res = await apiClient.get<OrderFeeSettings>("/order-fee-settings");
    return orderFeeSettingsSchema.parse(res.data);
  },
};
