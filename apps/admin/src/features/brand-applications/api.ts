import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import { brandApplicationSchema, type BrandApplicationStatusValue } from "./schemas";

const brandApplicationPageSchema = z.object({
  applications: z.array(brandApplicationSchema),
  nextCursor: z.string().nullable(),
});
export type BrandApplicationPage = z.infer<typeof brandApplicationPageSchema>;

export const brandApplicationsApi = {
  async list(status?: BrandApplicationStatusValue, cursor?: string): Promise<BrandApplicationPage> {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (cursor) params.set("cursor", cursor);

    const query = params.toString();
    const res = await apiClient.get<BrandApplicationPage>(
      `/brand-applications${query ? `?${query}` : ""}`,
    );
    return brandApplicationPageSchema.parse(res.data);
  },

  async approve(id: string): Promise<void> {
    await apiClient.post(`/brand-applications/${id}/approve`);
  },

  async reject(id: string, reason?: string): Promise<void> {
    await apiClient.post(`/brand-applications/${id}/reject`, reason ? { reason } : undefined);
  },
};
