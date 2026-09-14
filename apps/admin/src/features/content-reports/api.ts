import { apiClient } from "@/lib/apiClient";

import {
  type ContentReportPage,
  contentReportPageSchema,
  type ContentReportStatusValue,
  openContentReportCountSchema,
  type ResolveContentReportInput,
} from "./schemas";

export const contentReportsApi = {
  async list(status?: ContentReportStatusValue, cursor?: string): Promise<ContentReportPage> {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (cursor) params.set("cursor", cursor);
    const query = params.toString();
    const res = await apiClient.get<ContentReportPage>(
      `/content-reports${query ? `?${query}` : ""}`,
    );
    return contentReportPageSchema.parse(res.data);
  },

  async openCount(): Promise<number> {
    const res = await apiClient.get<{ openCount: number }>("/content-reports/open-count");
    return openContentReportCountSchema.parse(res.data).openCount;
  },

  async resolve(id: string, input: ResolveContentReportInput): Promise<void> {
    await apiClient.post(`/content-reports/${id}/resolve`, input);
  },
};
