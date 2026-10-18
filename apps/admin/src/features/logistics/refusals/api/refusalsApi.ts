import { apiClient } from "@/lib/apiClient";

import { type CustomerRefusals, customerRefusalsSchema } from "./refusalsSchemas";

const refusalsPath = (orderId: string) => `/logistics/admin/orders/${orderId}/delivery-refusals`;

export const refusalsApi = {
  async getForOrder(orderId: string): Promise<CustomerRefusals> {
    const res = await apiClient.get(refusalsPath(orderId));
    return customerRefusalsSchema.parse(res.data);
  },

  async clearForOrder(orderId: string, reason: string): Promise<CustomerRefusals> {
    const res = await apiClient.post(`${refusalsPath(orderId)}/clear`, { reason });
    return customerRefusalsSchema.parse(res.data);
  },
};
