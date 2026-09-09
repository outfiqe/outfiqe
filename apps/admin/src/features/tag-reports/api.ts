import { apiClient } from "@/lib/apiClient";

import {
  openTagReportCountSchema,
  type ResolveTagReportInput,
  type TagReportPage,
  tagReportPageSchema,
  type TagReportStatusValue,
} from "./schemas";

export const tagReportsApi = {
  async list(status?: TagReportStatusValue, cursor?: string): Promise<TagReportPage> {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (cursor) params.set("cursor", cursor);
    const query = params.toString();
    const res = await apiClient.get<TagReportPage>(`/tag-reports${query ? `?${query}` : ""}`);
    return tagReportPageSchema.parse(res.data);
  },

  async openCount(): Promise<number> {
    const res = await apiClient.get<{ openCount: number }>("/tag-reports/open-count");
    return openTagReportCountSchema.parse(res.data).openCount;
  },

  async resolve(id: string, input: ResolveTagReportInput): Promise<void> {
    await apiClient.post(`/tag-reports/${id}/resolve`, input);
  },
};
