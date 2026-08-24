import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import { adminWithdrawRequestSchema, type WithdrawRequestStatusValue } from "./schemas";

const withdrawRequestPageSchema = z.object({
  items: z.array(adminWithdrawRequestSchema),
  nextCursor: z.string().nullable(),
});
export type WithdrawRequestPage = z.infer<typeof withdrawRequestPageSchema>;

export const withdrawRequestsApi = {
  async list(status?: WithdrawRequestStatusValue, cursor?: string): Promise<WithdrawRequestPage> {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (cursor) params.set("cursor", cursor);

    const query = params.toString();
    const res = await apiClient.get<WithdrawRequestPage>(
      `/withdraw/admin/requests${query ? `?${query}` : ""}`,
    );
    return withdrawRequestPageSchema.parse(res.data);
  },

  async approve(id: string, identityCrossCheckConfirmed?: boolean): Promise<void> {
    await apiClient.patch(`/withdraw/admin/requests/${id}/approve`, {
      identityCrossCheckConfirmed,
    });
  },

  async reject(id: string, reason: string): Promise<void> {
    await apiClient.patch(`/withdraw/admin/requests/${id}/reject`, { reason });
  },

  async markPaid(id: string, referenceNote: string): Promise<void> {
    await apiClient.patch(`/withdraw/admin/requests/${id}/mark-paid`, { referenceNote });
  },
};
